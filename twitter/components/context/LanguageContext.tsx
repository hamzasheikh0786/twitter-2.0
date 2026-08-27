"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import axiosInstance from "@/Lib/axiosInstance";

type Language = "en" | "es" | "hi" | "pt" | "zh" | "fr";

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "fr", name: "French", nativeName: "Français" },
];

interface Translations {
  [key: string]: string | Translations;
}

interface LanguageContextType {
  language: Language;
  translations: Translations;
  isLoading: boolean;
  availableLanguages: LanguageOption[];
  changeLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
  showLanguageVerification: boolean;
  pendingLanguage: Language | null;
  verificationType: "email" | "phone" | null;
  verifyOtp: (otp: string) => Promise<void>;
  cancelLanguageChange: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

const loadTranslations = async (lang: Language): Promise<Translations> => {
  try {
    const response = await fetch(`/i18n/${lang}.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
  }
  return {};
};

const flattenTranslations = (obj: Translations, prefix = ""): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      Object.assign(result, flattenTranslations(obj[key] as Translations, newKey));
    } else {
      result[newKey] = obj[key] as string;
    }
  }
  return result;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const [language, setLanguage] = useState<Language>("en");
  const [translations, setTranslations] = useState<Translations>({});
  const [flatTranslations, setFlatTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showLanguageVerification, setShowLanguageVerification] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [verificationType, setVerificationType] = useState<"email" | "phone" | null>(null);

  useEffect(() => {
    const initLanguage = async () => {
      setIsLoading(true);
      let initialLang: Language = "en";

      if (user?.language) {
        initialLang = user.language as Language;
      } else if (typeof window !== "undefined") {
        const saved = localStorage.getItem("preferred-language") as Language;
        if (saved && LANGUAGES.some(l => l.code === saved)) {
          initialLang = saved;
        }
      }

      setLanguage(initialLang);
      const loaded = await loadTranslations(initialLang);
      setTranslations(loaded);
      setFlatTranslations(flattenTranslations(loaded));
      setIsLoading(false);
    };

    initLanguage();
  }, [user?.language]);

  const changeLanguage = useCallback(async (newLang: Language) => {
    if (newLang === language) return;

    if (newLang === "fr") {
      setVerificationType("email");
      setPendingLanguage(newLang);
      setShowLanguageVerification(true);
    } else {
      setVerificationType("phone");
      setPendingLanguage(newLang);
      setShowLanguageVerification(true);
    }
  }, [language]);

  const verifyOtp = useCallback(async (otp: string) => {
    if (!pendingLanguage || !verificationType || !user) return;

    try {
      const endpoint = verificationType === "email" 
        ? `/auth/verify-language-otp-email`
        : `/auth/verify-language-otp-phone`;

      await axiosInstance.post(endpoint, { 
        otp, 
        language: pendingLanguage,
        email: user.email,
        phone: user.phone 
      });

      const loaded = await loadTranslations(pendingLanguage);
      setTranslations(loaded);
      setFlatTranslations(flattenTranslations(loaded));
      setLanguage(pendingLanguage);
      localStorage.setItem("preferred-language", pendingLanguage);

      if (user) {
        await updateProfile({ 
          displayName: user.displayName, 
          bio: user.bio || "", 
          location: user.location || "", 
          website: user.website || "", 
          avatar: user.avatar, 
          language: pendingLanguage 
        });
      }

      setShowLanguageVerification(false);
      setPendingLanguage(null);
      setVerificationType(null);
    } catch (error) {
      console.error("Language verification failed:", error);
      throw error;
    }
  }, [pendingLanguage, verificationType, user, updateProfile]);

  const cancelLanguageChange = useCallback(() => {
    setShowLanguageVerification(false);
    setPendingLanguage(null);
    setVerificationType(null);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string>) => {
    let translation = flatTranslations[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(new RegExp(`{${paramKey}}`, "g"), paramValue);
      });
    }
    
    return translation;
  }, [flatTranslations]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        translations,
        isLoading,
        availableLanguages: LANGUAGES,
        changeLanguage,
        t,
        showLanguageVerification,
        pendingLanguage,
        verificationType,
        verifyOtp,
        cancelLanguageChange,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};