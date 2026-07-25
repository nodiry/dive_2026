import { useTranslation } from 'react-i18next';
import { en, ko, type Locale } from './translations';

export function useLocale() {
  const { i18n } = useTranslation();
  const locale: Locale = i18n.language.startsWith('en') ? 'en' : 'ko';

  return {
    locale,
    setLocale: (next: Locale) => i18n.changeLanguage(next),
    t: locale === 'en' ? en : ko,
  };
}
