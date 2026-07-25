import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Field, inputClass } from '@components/explore/controls';
import { ROUTES } from '@constants/path';
import { useLogin } from '@hooks/useAuth';
import { useAuthStore } from '@stores/useAuthStore';
import { useToastStore } from '@stores/useToastStore';
import { cn } from '@utils/cn';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);
  const login = useLogin();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login.mutate(
      { identifier, password },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.user);
          showSuccess(t('auth.loginSuccess', { username: data.user.username }));
          navigate(ROUTES.Root);
        },
        onError: (err) => showError(err.message),
      },
    );
  }

  return (
    <div className='mx-auto max-w-sm px-6 py-16'>
      <h1 className='text-2xl font-bold text-marine'>{t('auth.loginTitle')}</h1>
      <form
        onSubmit={handleSubmit}
        className='mt-6 space-y-4'
      >
        <Field label={t('auth.identifierLabel')}>
          <input
            required
            autoComplete='username'
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={cn(inputClass, 'w-full')}
          />
        </Field>
        <Field label={t('auth.passwordLabel')}>
          <input
            required
            type='password'
            autoComplete='current-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(inputClass, 'w-full')}
          />
        </Field>
        <button
          type='submit'
          disabled={login.isPending}
          className='w-full rounded-full bg-terracotta px-5 py-2.5 font-medium text-white transition-colors hover:bg-terracotta-dark disabled:pointer-events-none disabled:opacity-40'
        >
          {login.isPending ? t('auth.loginPending') : t('auth.loginSubmit')}
        </button>
      </form>
      <p className='mt-4 text-center text-sm text-slate'>
        {t('auth.noAccount')}{' '}
        <Link
          to={ROUTES.Signup}
          className='font-medium text-terracotta-dark hover:underline'
        >
          {t('auth.signupLink')}
        </Link>
      </p>
    </div>
  );
}
