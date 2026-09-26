import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';

import { track } from '@/services/analytics';

import ar from './locales/ar.json';
import en from './locales/en.json';

export type Language = 'en' | 'ar';

const LANGUAGE_KEY = 'oneq.language';

export const isRTLLanguage = (lang: Language) => lang === 'ar';

const deviceLanguage = (): Language => (getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en');

const isWeb = Platform.OS === 'web';

// Returns true when a reload is needed for the new direction to take effect.
const applyDirection = (lang: Language) => {
  const rtl = isRTLLanguage(lang);
  if (isWeb) {
    // react-native-web ignores I18nManager; direction comes from the document.
    if (typeof document === 'undefined') return false;
    const changed = document.documentElement.dir !== (rtl ? 'rtl' : 'ltr');
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    return changed;
  }
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return I18nManager.isRTL !== rtl;
};

// Layout direction for code that must mirror manually (icons, text inputs).
export const isRTL = () =>
  isWeb ? typeof document !== 'undefined' && document.documentElement.dir === 'rtl' : I18nManager.isRTL;

// React Native flips textAlign left/right in RTL layouts; the web does not.
// Align to the reading start, so Latin text (gym names, bios) also aligns right in Arabic.
export const alignStart = (): 'left' | 'right' => (isWeb && isRTL() ? 'right' : 'left');
// Physical left in any layout — for phone numbers, which always read left-to-right.
export const alignLeft = (): 'left' | 'right' => (!isWeb && isRTL() ? 'right' : 'left');

// Keeps numbers such as "+974 3333 4444" in LTR order inside Arabic text (Unicode LRI…PDI).
export const ltr = (s: string) => `⁦${s}⁩`;

export async function initI18n() {
  let stored: string | null = null;
  try {
    stored = await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    // Fall back to the device language.
  }
  const lang: Language = stored === 'ar' || stored === 'en' ? stored : deviceLanguage();

  // Direction changes only take effect after a reload; never reload on startup to avoid loops.
  applyDirection(lang);

  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: lang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export async function setLanguage(lang: Language) {
  track({ name: 'language_changed', language: lang });
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
  if (applyDirection(lang)) {
    if (isWeb) window.location.reload();
    else await Updates.reloadAsync();
  }
}

export const currentLanguage = (): Language => (i18n.language === 'ar' ? 'ar' : 'en');

export default i18n;
