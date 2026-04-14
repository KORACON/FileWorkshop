'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations';
import { api } from '@/lib/api-client';

export function ChangePasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setServerError(null);
    setSuccess(false);
    try {
      await api.post('/api/profile/change-password', data);
      setSuccess(true);
      reset();
    } catch (err: any) {
      setServerError(err.message || 'Ошибка смены пароля');
    }
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-txt-strong mb-4">Смена пароля</h3>

      {serverError && (
        <div className="mb-4 p-3 bg-error-light border border-error/20 rounded-lg text-sm text-error-text">
          {serverError}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-success-light border border-success/20 rounded-lg text-sm text-success-text">
          Пароль успешно изменён
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-txt-base mb-1">
            Текущий пароль
          </label>
          <input id="currentPassword" type="password" className="input-field" {...register('currentPassword')} />
          {errors.currentPassword && <p className="mt-1 text-sm text-error">{errors.currentPassword.message}</p>}
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-txt-base mb-1">
            Новый пароль
          </label>
          <input id="newPassword" type="password" className="input-field" {...register('newPassword')} />
          {errors.newPassword && <p className="mt-1 text-sm text-error">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-txt-base mb-1">
            Подтверждение
          </label>
          <input id="confirmNewPassword" type="password" className="input-field" {...register('confirmNewPassword')} />
          {errors.confirmNewPassword && <p className="mt-1 text-sm text-error">{errors.confirmNewPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
          {isSubmitting && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
          Сменить пароль
        </button>
      </form>
    </div>
  );
}

