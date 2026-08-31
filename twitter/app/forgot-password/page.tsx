"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@base-ui/react/input';
import TwitterLogo from '@/components/Twitterlogo';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import axiosInstance from '@/Lib/axiosInstance';

function ForgotPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [showModal, setShowModal] = useState(true);

  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <Card className="w-full max-w-md bg-black border-gray-800 text-white text-center">
          <CardHeader>
            <div className="mb-6 flex justify-center">
              <TwitterLogo size="xl" className="text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
            <p className="text-gray-400 mt-2 text-sm">
              Please use the reset password page
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = `/reset-password?token=${token}`} className="w-full">
              Go to Reset Password
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