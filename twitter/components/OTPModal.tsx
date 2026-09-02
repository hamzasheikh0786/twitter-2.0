"use client";

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TwitterLogo from '@/components/Twitterlogo';

interface User {
  _id: string;
  email: string;
  displayName: string;
}

interface OTPModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (user: User) => void;
    email: string;
}

export default function OTPModal({ isOpen, onClose, onSuccess, email }: OTPModalProps) {
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [attemptsLeft, setAttemptsLeft] = useState(3);
    const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
            setError('');
            setSuccess(false);
            setAttemptsLeft(3);
            setTimeout(() => inputsRef.current[0]?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value) || value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        if (value && index < 5) {
            inputsRef.current[index + 1]?.focus();
        } else if (!value && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }

        if (newOtp.every(v => v !== '')) {
            handleVerify();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = pasted.split('').map((v, i) => v || '');
        while (newOtp.length < 6) newOtp.push('');
        setOtp(newOtp);
        newOtp.forEach((v, i) => { if (v) inputsRef.current[i]?.focus(); });
        if (newOtp[5]) handleVerify();
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length !== 6 || isLoading) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: code })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.attemptsLeft !== undefined) {
                    setAttemptsLeft(data.attemptsLeft);
                }
                throw new Error(data.error || 'Verification failed');
            }

            setSuccess(true);
            onSuccess(data.user);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1500);
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError(error.message || 'Verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0 || isLoading) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok && data.requireOTP) {
                setResendCooldown(60);
                setOtp(['', '', '', '', '', '']);
                setAttemptsLeft(3);
                setError('');
            } else {
                setError(data.error || 'Failed to resend OTP');
            }
        } catch {
            setError('Failed to resend OTP');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-black border-gray-800 text-white">
                <CardHeader className="relative pb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-4 text-white hover:bg-gray-900"
                        onClick={onClose}
                        disabled={isLoading || success}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                    <div className="text-center">
                        <div className="mb-6 flex justify-center">
                            <TwitterLogo size="xl" className="text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {success ? 'Verified!' : 'Enter Verification Code'}
                        </CardTitle>
                        <p className="text-gray-400 mt-2 text-sm">
                            {success 
                                ? 'Login successful. Redirecting...' 
                                : `We've sent a 6-digit code to ${email}`}
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {error && (
                        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2 justify-center">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            Login successful!
                        </div>
                    )}

                    {!success && (
                        <>
                            <div className="flex gap-3 justify-center" role="group" aria-label="OTP code">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { inputsRef.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        className="w-12 h-14 text-center text-2xl font-bold bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                        disabled={isLoading}
                                        autoComplete="one-time-code"
                                    />
                                ))}
                            </div>

                            <p className="text-center text-xs text-gray-400">
                                {attemptsLeft < 3 && <span className="text-yellow-400">Attempts left: {attemptsLeft}</span>}
                            </p>

                            <Button
                                type="button"
                                variant={isLoading ? 'default' : 'ghost'}
                                className="w-full text-sm"
                                disabled={isLoading || resendCooldown > 0}
                                onClick={handleResend}
                            >
                                {resendCooldown > 0 
                                    ? `Resend code in ${resendCooldown}s` 
                                    : 'Didn\'t receive code? Resend'}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}