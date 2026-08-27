"use client";

import React, { useState } from "react";
import { useLanguage } from "@/components/context/LanguageContext";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Check, Globe, Mail, Smartphone, Loader2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

export default function LanguageSelector({ variant = "dropdown" }: { variant?: "dropdown" | "list" }) {
  const { language, availableLanguages, changeLanguage, t, isLoading } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = availableLanguages.find(l => l.code === language);

  if (variant === "list") {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4 space-y-2">
          <h3 className="text-white font-semibold mb-3">{t("language.selectLanguage")}</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                disabled={isLoading || lang.code === language}
                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                  lang.code === language
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-gray-700 hover:border-gray-600 hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getLanguageFlag(lang.code)}</span>
                  <div>
                    <p className="text-white font-medium">{lang.nativeName}</p>
                    <p className="text-xs text-gray-400">{lang.name}</p>
                  </div>
                </div>
                {lang.code === language && (
                  <Check className="h-5 w-5 text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-900">
            <Globe className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-white">{currentLang?.nativeName}</span>
          </Button>
        }
      />
      <DropdownMenuContent className="w-56 bg-black border-gray-800" align="end">
        <div className="p-2 border-b border-gray-800">
          <p className="text-xs text-gray-400 px-2">{t("language.currentLanguage")}</p>
        </div>
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className={`flex items-center space-x-2 px-2 py-2 rounded-lg ${
              lang.code === language ? "bg-blue-500/20" : "hover:bg-gray-900"
            }`}
            onClick={() => changeLanguage(lang.code)}
            disabled={isLoading || lang.code === language}
          >
            <span className="text-lg">{getLanguageFlag(lang.code)}</span>
            <div className="flex-1 text-left">
              <p className="text-white text-sm font-medium">{lang.nativeName}</p>
              <p className="text-xs text-gray-400">{lang.name}</p>
            </div>
            {lang.code === language && <Check className="h-4 w-4 text-blue-400" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem className="text-red-400 hover:bg-gray-900 flex items-center space-x-2">
          <X className="h-4 w-4" />
          <span>{t("common.cancel")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getLanguageFlag(code: string): string {
  const flags: Record<string, string> = {
    en: "🇺🇸",
    es: "🇪🇸",
    hi: "🇮🇳",
    pt: "🇧🇷",
    zh: "🇨🇳",
    fr: "🇫🇷",
  };
  return flags[code] || "🌐";
}