import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ar from './locales/ar.json';
import en from './locales/en.json';

export type Language = 'en' | 'ar';

const LANGUAGE_KEY = 'oneq.language';

export const isRTLLanguage = (lang: Language) => lang === 'ar';

const deviceLanguage = (): Language => (getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en');

const applyDirection = (lang: Language) => {
  const rtl = isRTLLanguage(lang);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return I18nManager.isRTL !== rtl;
};

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
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
  if (applyDirection(lang)) {
    await Updates.reloadAsync();
  }
}

export const currentLanguage = (): Language => (i18n.language === 'ar' ? 'ar' : 'en');

export default i18n;
