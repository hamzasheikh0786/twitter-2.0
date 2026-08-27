"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface NotificationContextType {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, body: string, tag?: string) => void;
  isSupported: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return "denied";
    
    const perm = await Notification.requestPermission();
    setPermission(perm);
    return perm;
  }, [isSupported]);

  const showNotification = useCallback((title: string, body: string, tag?: string) => {
    if (!isSupported || permission !== "granted") return;

    const notification = new Notification(title, {
      body,
      tag: tag || "tweet-notification",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 10000);
  }, [isSupported, permission]);

  return (
    <NotificationContext.Provider value={{ permission, requestPermission, showNotification, isSupported }}>
      {children}
    </NotificationContext.Provider>
  );
};