import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/constants/i18n/en.json';
import ko from '@/constants/i18n/ko.json';

/** Korean first, English via the in-app toggle, mirroring the web's rule. */
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { ko: { translation: ko }, en: { translation: en } },
    lng: 'ko',
    fallbackLng: 'ko',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
