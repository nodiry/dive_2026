import { useTranslation } from 'react-i18next';
import Select from '@components/ui/Select';
import { cn } from '@utils/cn';

interface LanguageMenuProps {
  className?: string;
}

export function LanguageMenu({ className }: LanguageMenuProps) {
  const { t, i18n } = useTranslation();

  return (
    <Select
      ariaLabel={t('languageLabel')}
      value={i18n.language.startsWith('en') ? 'en' : 'ko'}
      onChange={(lng) => i18n.changeLanguage(lng)}
      options={[
        { value: 'ko', label: '한국어' },
        { value: 'en', label: 'English' },
      ]}
      className={cn('w-28', className)}
    />
  );
}
