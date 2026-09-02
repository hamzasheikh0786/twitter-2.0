"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/components/context/LanguageContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Mail, Smartphone, Loader2, AlertCircle, CheckCircle, X } from "lucide-react";
import axiosInstance from "@/Lib/axiosInstance";

export default function LanguageVerificationModal() {
  const { 
    showLanguageVerification, 
    pendingLanguage, 
    verificationType, 
    verifyOtp, 
    cancelLanguageChange, 
    t,
    availableLanguages,
    isLoading 
  } = useLanguage();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputsRef = useRef<HTMLInputElement[]>([]);

  const lang = availableLanguages.find(l => l.code === pendingLanguage);

  useEffect(() => {
    if (showLanguageVerification) {
      setOtp("");
      setError("");
      setSuccess(false);
      setIsVerifying(false);
      inputsRef.current[0]?.focus();
    }
  }, [showLanguageVerification]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(0, 1);
    const newOtp = otp.split("");
    newOtp[index] = value;
    setOtp(newOtp.join(""));
    
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
    
    if (newOtp.join("").length === 6) {
      handleVerify();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6 || isVerifying) return;
    
    setIsVerifying(true);
    setError("");
    
    try {
      await verifyOtp(otp);
      setSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Verification failed";
      setError(t("language.languageChangeFailed"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !pendingLanguage) return;
    
    try {
        await axiosInstance.post("/auth/resend-language-otp", {
        language: pendingLanguage,
        type: verificationType,
      });
      setResendCooldown(60);
    } catch (err) {
      console.error("Failed to resend OTP:", err);
    }
  };

  if (!showLanguageVerification || !pendingLanguage) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4" 
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
         onClick={cancelLanguageChange}>
      <Card className="w-full max-w-md bg-black border-gray-800 text-white relative" onClick={e => e.stopPropagation()}>
        <CardHeader className="pb-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">{t("language.verificationRequired")}</CardTitle>
            <Button variant="ghost" size="icon" onClick={cancelLanguageChange} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              {verificationType === "email" ? (
                <Mail className="h-5 w-5 text-blue-400" />
              ) : (
                <Smartphone className="h-5 w-5 text-blue-400" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{lang?.nativeName}</p>
              <p className="text-sm text-gray-400">
                {verificationType === "email" 
                  ? t("language.emailVerification") 
                  : t("language.phoneVerification")}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-400 text-center">
            {verificationType === "email" 
              ? t("language.otpSentToEmail") 
              : t("language.otpSentToPhone")}
          </p>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{t("language.languageChangeSuccess")}</span>
            </div>
          )}

          <div className="flex items-center justify-center space-x-2">
            {[...Array(6)].map((_, i) => (
              <Input
                key={i}
                ref={(el) => { if (el) inputsRef.current[i] = el; }}
                type="text"
                maxLength={1}
                value={otp[i] || ""}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-10 h-12 text-center text-2xl bg-gray-800 border-gray-600 text-white focus:border-blue-500"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={isVerifying || success}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
            <span>{t("language.enterOtpToConfirm")}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-400 hover:text-blue-300 p-0"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isVerifying || success}
            >
              {resendCooldown > 0 
                ? `${t("auth.resendOtp")} (${resendCooldown}s)`
                : t("auth.resendOtp")}
            </Button>
          </div>

          <Button
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700"
            onClick={handleVerify}
            disabled={otp.length !== 6 || isVerifying || success}
          >
            {isVerifying ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("common.loading")}</span>
              </div>
            ) : (
              t("common.confirm")
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full border-gray-600 text-gray-400 hover:text-white"
            onClick={cancelLanguageChange}
            disabled={isVerifying}
          >
            {t("common.cancel")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}