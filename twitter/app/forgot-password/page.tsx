"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@base-ui/react/input';
import TwitterLogo from '@/components/Twitterlogo';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import { generateSecurePassword } from '@/Lib/passwordGenerator';
import axiosInstance from '@/Lib/axiosInstance';

function ForgotPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [showModal, setShowModal] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Generate password on first render if token exists
  if (token && !generatedPassword) {
    setGeneratedPassword(generateSecurePassword(12));
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await axiosInstance.post('/reset-password', {
        token: token || '',
        password
      });

      if (response.status === 200) {
        setSuccess(true);
        setPassword('');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(generatedPassword);
    alert('Password copied to clipboard!');
  };

  if (token && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md bg-black border-gray-800 text-white">
          <CardHeader className="text-center">
            <div className="mb-6 flex justify-center">
              <TwitterLogo size="xl" className="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
            <p className="text-gray-400 mt-2 text-sm">
              Enter your new password below
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

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
                  Copy
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
                  {showPassword ? 'Hide' : 'Show'}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Or enter your own password below
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md bg-black border-gray-800 text-white text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">Password Reset Successful</CardTitle>
            <p className="text-gray-400 mt-2">Your password has been reset successfully.</p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-black border-gray-800 text-white">
        <CardHeader className="text-center">
          <div className="mb-6 flex justify-center">
            <TwitterLogo size="xl" className="text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
          <p className="text-gray-400 mt-2 text-sm">
            Enter your email or phone to receive a password reset link
          </p>
        </CardHeader>

        <CardContent>
          <ForgotPasswordModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onBackToLogin={() => window.location.href = '/'}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black">Loading...</div>}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}