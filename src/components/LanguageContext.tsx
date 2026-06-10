/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { LanguageCode, TranslationDict } from '../types';
import { translations, LANGUAGES } from '../translations';

interface LanguageContextType {
  locale: LanguageCode;
  setLocale: (code: LanguageCode) => void;
  t: TranslationDict;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Arabic ('ar') as requested by user ("Arabic default RTL")
  const [locale, setLocaleState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('app_locale') as LanguageCode;
    return saved && translations[saved] ? saved : 'ar';
  });

  const setLocale = (code: LanguageCode) => {
    if (translations[code]) {
      setLocaleState(code);
      localStorage.setItem('app_locale', code);
    }
  };

  const activeLangDef = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];
  const isRTL = activeLangDef.isRTL;

  useEffect(() => {
    // Dynamically adjust text direction of the body
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale, isRTL]);

  const value: LanguageContextType = {
    locale,
    setLocale,
    t: translations[locale],
    isRTL
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
