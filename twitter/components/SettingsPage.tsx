"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/context/AuthContext";
import { useLanguage } from "@/components/context/LanguageContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, Bell, Shield, Globe } from "lucide-react";
import LanguageSelector from "./LanguageSelector";

interface SettingsPageProps {
  onBack?: () => void;
}

export default function SettingsPage({ onBack }: SettingsPageProps) {
  const { user, updateNotificationPreference } = useAuth();
  const { t, isLoading: langLoading } = useLanguage();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleNotificationToggle = async (enabled: boolean) => {
    await updateNotificationPreference(enabled);
    if (enabled && notificationPermission !== "granted") {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="flex items-center px-4 py-3 space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-gray-900"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <h1 className="text-xl font-bold text-white">{t("settings.settings")}</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-400" />
              <span>{t("settings.language")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">{t("settings.languageDesc")}</p>
            <LanguageSelector variant="list" />
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center space-x-2">
              <Bell className="h-5 w-5 text-blue-400" />
              <span>{t("settings.notifications")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-white mb-1">{t("settings.keywordNotifications")}</p>
                <p className="text-sm text-gray-400">{t("settings.keywordNotificationsDesc")}</p>
              </div>
              <button
                onClick={() => handleNotificationToggle(!user?.notificationEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  user?.notificationEnabled ? "bg-blue-500" : "bg-gray-600"
                }`}
                role="switch"
                aria-checked={user?.notificationEnabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    user?.notificationEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {user?.notificationEnabled && (
              <div className="p-4 bg-gray-800 rounded-lg">
                {notificationPermission !== "granted" ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                      Browser notifications are not enabled. Click below to allow notifications.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white text-black hover:bg-gray-200 font-semibold rounded-full px-4"
                      onClick={requestNotificationPermission}
                    >
                      Enable Browser Notifications
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-green-400">
                    Browser notifications are enabled. You'll receive popup notifications for cricket and science tweets.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3 border-b border-gray-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <span>{t("settings.security")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-400">
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="font-medium text-white mb-2">Two-Factor Authentication</p>
              <p>Enabled for Chrome browser logins via email OTP</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="font-medium text-white mb-2">Microsoft Browser Access</p>
              <p>Direct login allowed for Microsoft Edge and Internet Explorer</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="font-medium text-white mb-2">Mobile Login Restrictions</p>
              <p>Mobile access restricted to 10:00 AM - 1:00 PM daily</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}