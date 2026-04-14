'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      router.push('/profile');
    } catch (err: any) {
      setServerError(err.message || 'Ошибка входа');
    }
  };

  return (
    <div className="card">
      <h1 className="text-2xl font-bold text-center mb-6">Вход</h1>

      {serverError && (
        <div className="mb-4 p-3 bg-error-light border border-error/20 rounded-lg text-sm text-error-text">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-txt-base mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input-field"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-error">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-txt-base mb-1">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input-field"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-error">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isSubmitting && (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          )}
          {isSubmitting ? 'Вход...' : 'Войти'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-txt-muted">
        Нет аккаунта?{' '}
        <Link href="/auth/register" className="text-primary hover:text-primary-ring font-medium">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}

