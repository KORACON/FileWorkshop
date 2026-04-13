'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validations';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

export function RegisterForm() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      await registerUser(data.email, data.password, data.confirmPassword, data.name || undefined);
      router.push('/profile');
    } catch (err: any) {
      setServerError(err.message || 'Ошибка регистрации');
    }
  };

  return (
    <div className="card">
      <h1 className="text-2xl font-bold text-center mb-6">Регистрация</h1>

      {serverError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Имя <span className="text-slate-400">(необязательно)</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="input-field"
            placeholder="Как вас зовут"
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            className="input-field"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1">
            Пароль
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            className="input-field"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Минимум 8 символов, строчная и заглавная буква, цифра
          </p>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
            Подтверждение пароля
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className="input-field"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
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
          {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Уже есть аккаунт?{' '}
        <Link href="/auth/login" className="text-primary-600 hover:text-primary-500 font-medium">
          Войти
        </Link>
      </p>
    </div>
  );
}
