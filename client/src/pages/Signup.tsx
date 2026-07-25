import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Field, inputClass } from '@components/explore/controls';
import { ROUTES } from '@constants/path';
import { useSignup } from '@hooks/useAuth';
import { useAuthStore } from '@stores/useAuthStore';
import { useToastStore } from '@stores/useToastStore';
import { cn } from '@utils/cn';

export function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const showSuccess = useToastStore((s) => s.showSuccess);
  const showError = useToastStore((s) => s.showError);
  const signup = useSignup();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    signup.mutate(
      { username, email, password },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.user);
          showSuccess(t('auth.signupSuccess', { username: data.user.username }));
          navigate(ROUTES.Root);
        },
        onError: (err) => showError(err.message),
      },
    );
  }

  return (
    <div className='mx-auto max-w-sm px-6 py-16'>
      <h1 className='text-2xl font-bold text-marine'>{t('auth.signupTitle')}</h1>
      <form
        onSubmit={handleSubmit}
        className='mt-6 space-y-4'
      >
        <Field label={t('auth.usernameLabel')}>
          <input
            required
            minLength={3}
            maxLength={32}
            autoComplete='username'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={cn(inputClass, 'w-full')}
          />
        </Field>
        <Field label={t('auth.emailLabel')}>
          <input
            required
            type='email'
            autoComplete='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(inputClass, 'w-full')}
          />
        </Field>
        <Field label={t('auth.passwordLabel')}>
          <input
            required
            type='password'
            minLength={8}
            autoComplete='new-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(inputClass, 'w-full')}
          />
        </Field>
        <button
          type='submit'
          disabled={signup.isPending}
          className='w-full rounded-full bg-terracotta px-5 py-2.5 font-medium text-white transition-colors hover:bg-terracotta-dark disabled:pointer-events-none disabled:opacity-40'
        >
          {signup.isPending ? t('auth.signupPending') : t('auth.signupSubmit')}
        </button>
      </form>
      <p className='mt-4 text-center text-sm text-slate'>
        {t('auth.hasAccount')}{' '}
        <Link
          to={ROUTES.Login}
          className='font-medium text-terracotta-dark hover:underline'
        >
          {t('auth.loginLink')}
        </Link>
      </p>
    </div>
  );
}
