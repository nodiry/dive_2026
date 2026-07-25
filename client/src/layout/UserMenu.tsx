import { Check, Info, Languages, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROUTES } from '@constants/path';
import { useAuthStore } from '@stores/useAuthStore';
import { useToastStore } from '@stores/useToastStore';
import { cn } from '@utils/cn';

interface UserMenuProps {
  className?: string;
}

const LANGUAGES = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
] as const;

const ITEM_CLASS =
  'flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-left text-sm text-slate transition-colors hover:bg-lilac hover:text-violet-dark';

/**
 * Renders its dropdown in a body portal — an in-place absolute menu would be
 * trapped inside ExploreNavbar's own stacking context (its `backdrop-blur`
 * creates one per the CSS spec), so the map screen's ListPanel (z-10,
 * elsewhere in the tree) would paint over it regardless of z-index. Same
 * fix as components/ui/Select.tsx.
 *
 * It also carries About and the language choice: both are low-frequency, and
 * as separate controls they cost the header ~130px that the AI input needed.
 * The menu therefore opens for signed-out visitors too, who would otherwise
 * lose access to them.
 */
export function UserMenu({ className }: UserMenuProps) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const showSuccess = useToastStore((s) => s.showSuccess);
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const language = i18n.language.startsWith('en') ? 'en' : 'ko';

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!open) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuRect({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
      }
    }
    setOpen((v) => !v);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type='button'
        aria-expanded={open}
        aria-haspopup='menu'
        aria-label={user ? user.username : t('nav.menuLabel')}
        onClick={toggleOpen}
        className='flex items-center gap-1.5 rounded-full border border-slate-light/40 bg-white p-2 text-sm font-medium text-plum transition-colors hover:border-violet/40 sm:px-3.5 sm:py-1.5'
      >
        <UserIcon className='size-4 text-slate-light' />
        {user && <span className='hidden max-w-24 truncate sm:inline'>{user.username}</span>}
      </button>

      {createPortal(
        open && menuRect && (
          <div
            ref={menuRef}
            role='menu'
            style={{ top: menuRect.top, right: menuRect.right }}
            className='fixed z-50 w-44 rounded-2xl border border-slate-light/30 bg-white p-1.5 shadow-lg'
          >
            <Link
              to={ROUTES.About}
              role='menuitem'
              onClick={() => setOpen(false)}
              className={ITEM_CLASS}
            >
              <Info className='size-4' />
              {t('nav.aboutLabel')}
            </Link>

            <div
              aria-hidden
              className='my-1.5 h-px bg-slate-light/25'
            />
            <p className='flex items-center gap-2 px-3 py-1 font-mono text-xs text-slate-light'>
              <Languages className='size-3.5' />
              {t('languageLabel')}
            </p>
            {LANGUAGES.map((option) => (
              <button
                key={option.value}
                type='button'
                role='menuitemradio'
                aria-checked={language === option.value}
                onClick={() => {
                  void i18n.changeLanguage(option.value);
                  setOpen(false);
                }}
                className={cn(
                  ITEM_CLASS,
                  language === option.value && 'font-medium text-violet-dark',
                )}
              >
                <Check
                  className={cn('size-4', language !== option.value && 'opacity-0')}
                  aria-hidden
                />
                {option.label}
              </button>
            ))}

            <div
              aria-hidden
              className='my-1.5 h-px bg-slate-light/25'
            />
            {user ? (
              <button
                type='button'
                role='menuitem'
                onClick={() => {
                  logout();
                  setOpen(false);
                  showSuccess(t('auth.logoutSuccess'));
                }}
                className={ITEM_CLASS}
              >
                <LogOut className='size-4' />
                {t('nav.logout')}
              </button>
            ) : (
              <Link
                to={ROUTES.Login}
                role='menuitem'
                onClick={() => setOpen(false)}
                className={ITEM_CLASS}
              >
                <LogIn className='size-4' />
                {t('nav.login')}
              </Link>
            )}
          </div>
        ),
        document.body,
      )}
    </div>
  );
}
