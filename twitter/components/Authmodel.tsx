"use client";

import React, { useState } from 'react';
import { useAuth } from '@/components/context/AuthContext';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

import LoadingSpinner from './loading-spinner';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Separator } from './ui/separator';

import TwitterLogo from './Twitterlogo';
import { Input } from '@base-ui/react/input';
import ForgotPasswordModal from './ForgotPasswordModal';
import OTPModal from './OTPModal';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/components/context/firebase";
import axiosInstance from '@/Lib/axiosInstance';


interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
    const { login, signup, loginWithBackendUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showOTP, setShowOTP] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
        displayName: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen) return null;

    const handleForgotPassword = () => {
        setShowForgotPassword(true);
    };

    const handleBackToLogin = () => {
        setShowForgotPassword(false);
    };

    const handleOTPSuccess = (user: { email: string }) => {
        login(user.email, ''); // Password not needed as backend already validated
        onClose();
        setFormData({ email: '', password: '', username: '', displayName: '' });
        setErrors({});
        setShowOTP(false);
        setOtpEmail('');
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'signup') {
            if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
            } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
            } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

        if (!formData.displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm() || isLoading) return;

        if (mode === 'login') {
            setIsLoading(true);
            setErrors({});
            try {
                console.log('🔐 Attempting Firebase login for:', formData.email);
                // Step 1: Try Firebase Auth first
                try {
                    const userCred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                    console.log('🔐 Firebase login successful:', userCred.user.email);

                    if (!userCred.user.email) {
                        setErrors({ general: 'Firebase login failed: No email associated with this account.' });
                        setIsLoading(false);
                        return;
                    }
                    
                    // Fetch user data from backend
                    const userResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/loggedinuser?email=${encodeURIComponent(userCred.user.email)}`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    
                    const data = await userResponse.json();
                    console.log('🔐 Backend user response:', userResponse.status, data);

                    if (!userResponse.ok || !data) {
                        setErrors({ general: 'User not found in database. Please sign up.' });
                        setIsLoading(false);
                        return;
                    }

                    console.log('🔐 Login successful, setting user:', data);
                    loginWithBackendUser(data);
                    setTimeout(() => {
                        console.log('🔐 Closing modal');
                        onClose();
                    }, 100);
                    setFormData({ email: '', password: '', username: '', displayName: '' });
                    setErrors({});
                } catch (firebaseErr: any) {
                    console.log('🔐 Firebase auth failed:', firebaseErr.code, '- trying backend fallback');
                    
                    // Fallback: Try backend login (for users created before Firebase integration)
                    if (firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/invalid-credential') {
                        console.log('🔐 Attempting backend fallback login...');
                        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                email: formData.email, 
                                password: formData.password 
                            })
                        });

                        const data = await response.json();
                        console.log('🔐 Backend fallback response:', response.status, data);

                        if (!response.ok) {
                            if (data.blocked && data.reason === 'mobile_time_restriction') {
                                setErrors({ general: data.error });
                            } else if (data.requireOTP) {
                                setOtpEmail(data.email);
                                setShowOTP(true);
                            } else {
                                setErrors({ general: data.error || 'Login failed' });
                            }
                            setIsLoading(false);
                            return;
                        }

                        if (data.user) {
                            console.log('🔐 Backend fallback successful, setting user:', data.user);
                            loginWithBackendUser(data.user);
                            setTimeout(() => {
                                console.log('🔐 Closing modal');
                                onClose();
                            }, 100);
                            setFormData({ email: '', password: '', username: '', displayName: '' });
                            setErrors({});
                        } else {
                            console.log('🔐 No user in backend response');
                            setErrors({ general: 'Invalid credentials' });
                        }
                    } else {
                        // Other Firebase errors (network, too-many-requests, etc.)
                        let errorMsg = 'Authentication failed. Please try again.';
                        if (firebaseErr.code === 'auth/too-many-requests') errorMsg = 'Too many failed attempts. Try again later.';
                        else if (firebaseErr.code === 'auth/network-request-failed') errorMsg = 'Network error. Check your connection.';
                        setErrors({ general: errorMsg });
                    }
                }
            } catch (err) {
                console.error('🔐 Login error:', err);
                setErrors({ general: 'Authentication failed. Please try again.' });
            } finally {
                setIsLoading(false);
            }
        } else {
            // Signup flow remains the same
            try {
                await signup(formData.email, formData.password, formData.username, formData.displayName);
                onClose();
                setFormData({ email: '', password: '', username: '', displayName: '' });
                setErrors({});
            } catch (err: any) {
                console.log('🔐 Signup error:', err);
                const errorMsg = err.message || 'Authentication failed. Please try again.';
                setErrors({ general: errorMsg });
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setErrors({});
        setFormData({ email: '', password: '', username: '', displayName: '' });
    };

    return (
    <>
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-black border-gray-800 text-white">
            <CardHeader className="relative pb-6">
        <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-gray-900"
            onClick={onClose}
        >
            <X className="h-5 w-5" />
        </Button>
            <div className="text-center">
                <div className="mb-6 flex justify-center">
                    <TwitterLogo size="xl" className="text-white" />
                </div>
            <CardTitle className="text-2xl font-bold">
                {mode === 'login' ? 'Sign in to X' : 'Create your account'}
            </CardTitle>
            </div>
        </CardHeader>

        <CardContent className="space-y-6">
        {errors.general && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                {errors.general}
            </div>
        )}

            <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
            <>
                <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-white">Display Name</Label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                        id="displayName"
                        type="text"
                        placeholder="Your display name"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                        disabled={isLoading}
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-red-400 text-sm">{errors.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                    <Input
                      id="username"
                      type="text"
                      placeholder="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="pl-8 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-400 text-sm">{errors.username}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white">Password</Label>
                {mode === 'login' && (
                  <Button
                    type="button"
                    variant="link"
                    className="text-blue-400 hover:text-blue-300 text-sm p-0"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 pr-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                mode === 'login' ? 'Sign in' : 'Create account'
              )}
            </Button>
          </form>

          <div className="relative">
            <Separator className="bg-gray-700" />
            <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black px-2 text-gray-400 text-sm">
              OR
            </span>
          </div>

          <div className="text-center">
            <p className="text-gray-400">
              {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              <Button
                variant="link"
                className="text-blue-400 hover:text-blue-300 font-semibold pl-1"
                onClick={switchMode}
                disabled={isLoading}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </Button>
            </p>
          </div>

          {mode === 'signup' && (
            <div className="text-center text-xs text-gray-400">
              By signing up, you agree to our Terms of Service and Privacy Policy, including Cookie Use.
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    <ForgotPasswordModal
      isOpen={showForgotPassword}
      onClose={() => setShowForgotPassword(false)}
      onBackToLogin={handleBackToLogin}
    />

    <OTPModal
      isOpen={showOTP}
      onClose={() => setShowOTP(false)}
      onSuccess={handleOTPSuccess}
      email={otpEmail}
    />
    </>
  );
}
