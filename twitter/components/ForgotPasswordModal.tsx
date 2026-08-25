"use client";

import React, { useState } from 'react';
import { X, Mail, Phone, ArrowLeft, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@base-ui/react/input';
import { generateSecurePassword } from '@/Lib/passwordGenerator';
import axiosInstance from '@/Lib/axiosInstance';
import TwitterLogo from '@/components/Twitterlogo';

interface ForgotPasswordProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose, onBackToLogin }: ForgotPasswordProps) {
  const [step, setStep] = useState<'contact' | 'verify' | 'success'>('contact');
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [contactValue, setContactValue] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const validateContact = () => {
    if (!contactValue.trim()) {
      setError('Please enter your email or phone number');
      return false;
    }
    if (contactType === 'email' && !/\S+@\S+\.\S+/.test(contactValue)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (contactType === 'phone' && !/^[\d\s\-\+\(\)]{10,}$/.test(contactValue)) {
      setError('Please enter a valid phone number');
      return false;
    }
    setError('');
    return true;
  };

  const handleRequestReset = async () => {
    if (!validateContact() || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const requestData = contactType === 'email' 
        ? { email: contactValue.toLowerCase() }
        : { phone: contactValue };
      
      const response = await axiosInstance.post('/forgot-password', requestData);

      if (response.status === 429) {
        setError('You can use this option only one time per day.');
        setIsLoading(false);
        return;
      }

      // Generate a secure password for the user
      const newPassword = generateSecurePassword(12);
      setGeneratedPassword(newPassword);
      setSuccessMessage(response.data.message || 'Password reset instructions sent!');
      setStep('verify');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 429) {
        setError('You can use this option only one time per day.');
      } else {
        setError('Failed to send reset instructions. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  const copyPassword = async () => {
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackToLogin = () => {
    setStep('contact');
    setContactValue('');
    setGeneratedPassword('');
    setError('');
    setSuccessMessage('');
    onBackToLogin();
  };

  return (
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
              {step === 'contact' ? 'Forgot Password?' : step === 'verify' ? 'Check Your Email' : 'Password Reset'}
            </CardTitle>
            <p className="text-gray-400 mt-2 text-sm">
              {step === 'contact' 
                ? "Enter your email or phone to receive a password reset link"
                : step === 'verify'
                  ? "We've sent a reset link to your email. Your new password is generated below."
                  : "Your password has been reset successfully"}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {successMessage && step !== 'contact' && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-green-400 text-sm">
              {successMessage}
            </div>
          )}

          {step === 'contact' && (
            <form onSubmit={(e) => { e.preventDefault(); handleRequestReset(); }} className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={contactType === 'email' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => { setContactType('email'); setError(''); }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={contactType === 'phone' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => { setContactType('phone'); setError(''); }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Phone
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact" className="text-white">
                  {contactType === 'email' ? 'Email Address' : 'Phone Number'}
                </Label>
                <div className="relative">
                  <Input
                    id="contact"
                    type={contactType === 'email' ? 'email' : 'tel'}
                    placeholder={contactType === 'email' ? 'Enter your email' : 'Enter your phone number'}
                    value={contactValue}
                    onChange={(e) => { setContactValue(e.target.value); if (error) setError(''); }}
                    className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-full text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2 justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-white font-medium">Generated Password</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyPassword}
                    className="text-gray-400 hover:text-white"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={generatedPassword}
                    readOnly
                    className="flex-1 bg-transparent border-gray-600 text-white font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-white"
                  >
                    {showPassword ? <span className="text-xs">Hide</span> : <span className="text-xs">Show</span>}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Password contains only letters (uppercase & lowercase). Save it securely!
                </p>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 text-yellow-400 text-sm">
                <strong>Important:</strong> Use this password to sign in, then change it in settings.
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleBackToLogin}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-gray-300">Your password has been reset successfully.</p>
              <Button onClick={handleBackToLogin} className="w-full">
                Sign In
              </Button>
            </div>
          )}

          <div className="relative">
            <Separator className="bg-gray-700" />
            <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black px-2 text-gray-400 text-sm">
              OR
            </span>
          </div>

          <Button
            variant="link"
            className="w-full text-blue-400 hover:text-blue-300 font-semibold"
            onClick={onBackToLogin}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2 inline" />
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}