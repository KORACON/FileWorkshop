'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validations';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/profile');
  }, [authLoading, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      router.push('/');
    } catch (err: any) {
      setServerError(err.message || 'Неверный email или пароль');
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold text-center mb-6">Вход</h1>

          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input id="email" type="email" autoComplete="email" className="input-field" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
              <input id="password" type="password" autoComplete="current-password" className="input-field" {...register('password')} />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              {isSubmitting ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-primary-600 hover:text-primary-500 font-medium">Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
