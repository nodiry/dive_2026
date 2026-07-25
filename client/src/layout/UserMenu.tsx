import { LogOut, User as UserIcon } from 'lucide-react';
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

/**
 * Renders its dropdown in a body portal — an in-place absolute menu would be
 * trapped inside ExploreNavbar's own stacking context (its `backdrop-blur`
 * creates one per the CSS spec), so the map screen's ListPanel (z-10,
 * elsewhere in the tree) would paint over it regardless of z-index. Same
 * fix as components/ui/Select.tsx.
 */
export function UserMenu({ className }: UserMenuProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const showSuccess = useToastStore((s) => s.showSuccess);
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  if (!user) {
    return (
      <Link
        to={ROUTES.Login}
        className={cn(
          'flex items-center gap-1.5 rounded-full p-2 text-sm font-medium text-plum/70 transition-colors hover:bg-plum/10 sm:px-3.5 sm:py-1.5',
          className,
        )}
      >
        <UserIcon className='size-4' />
        <span className='hidden sm:inline'>{t('nav.login')}</span>
      </Link>
    );
  }

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
        onClick={toggleOpen}
        className='flex items-center gap-1.5 rounded-full border border-slate-light/40 bg-white p-2 text-sm font-medium text-plum transition-colors hover:border-violet/40 sm:px-3.5 sm:py-1.5'
      >
        <UserIcon className='size-4 text-slate-light' />
        <span className='hidden max-w-24 truncate sm:inline'>{user.username}</span>
      </button>

      {createPortal(
        open && menuRect && (
          <div
            ref={menuRef}
            role='menu'
            style={{ top: menuRect.top, right: menuRect.right }}
            className='fixed z-50 w-40 rounded-2xl border border-slate-light/30 bg-white p-1.5 shadow-lg'
          >
            <button
              type='button'
              role='menuitem'
              onClick={() => {
                logout();
                setOpen(false);
                showSuccess(t('auth.logoutSuccess'));
              }}
              className='flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-left text-sm text-slate transition-colors hover:bg-lilac hover:text-violet-dark'
            >
              <LogOut className='size-4' />
              {t('nav.logout')}
            </button>
          </div>
        ),
        document.body,
      )}
    </div>
  );
}
