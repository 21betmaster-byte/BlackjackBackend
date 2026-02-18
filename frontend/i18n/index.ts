import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import zh from './locales/zh.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import es from './locales/es.json';
import tl from './locales/tl.json';
import de from './locales/de.json';
import cs from './locales/cs.json';
import el from './locales/el.json';
import pl from './locales/pl.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}', nativeLabel: 'English' },
  { code: 'zh', label: 'Mandarin', flag: '\u{1F1E8}\u{1F1F3}', nativeLabel: '\u4E2D\u6587' },
  { code: 'fr', label: 'French', flag: '\u{1F1EB}\u{1F1F7}', nativeLabel: 'Fran\u00E7ais' },
  { code: 'it', label: 'Italian', flag: '\u{1F1EE}\u{1F1F9}', nativeLabel: 'Italiano' },
  { code: 'nl', label: 'Dutch', flag: '\u{1F1F3}\u{1F1F1}', nativeLabel: 'Nederlands' },
  { code: 'es', label: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}', nativeLabel: 'Espa\u00F1ol' },
  { code: 'tl', label: 'Tagalog', flag: '\u{1F1F5}\u{1F1ED}', nativeLabel: 'Tagalog' },
  { code: 'de', label: 'German', flag: '\u{1F1E9}\u{1F1EA}', nativeLabel: 'Deutsch' },
  { code: 'cs', label: 'Czech', flag: '\u{1F1E8}\u{1F1FF}', nativeLabel: '\u010Ce\u0161tina' },
  { code: 'el', label: 'Greek', flag: '\u{1F1EC}\u{1F1F7}', nativeLabel: '\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC' },
  { code: 'pl', label: 'Polish', flag: '\u{1F1F5}\u{1F1F1}', nativeLabel: 'Polski' },
];

const deviceLocale = Localization.getLocales()?.[0]?.languageCode ?? 'en';
const supportedCodes = SUPPORTED_LANGUAGES.map(l => l.code);
const detectedLanguage = supportedCodes.includes(deviceLocale) ? deviceLocale : 'en';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    fr: { translation: fr },
    it: { translation: it },
    nl: { translation: nl },
    es: { translation: es },
    tl: { translation: tl },
    de: { translation: de },
    cs: { translation: cs },
    el: { translation: el },
    pl: { translation: pl },
  },
  lng: detectedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
