'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api-client';
import { ChangePasswordForm } from '@/components/profile/change-password-form';
import { SessionsList } from '@/components/profile/sessions-list';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [profileSuccess, setProfileSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user?.name || '' },
  });

  const onUpdateProfile = async (data: UpdateProfileInput) => {
    setProfileSuccess(false);
    try {
      const res = await api.patch<{ id: string; email: string; name: string | null }>('/api/profile', data);
      setUser({ ...user!, name: res.data.name });
      setProfileSuccess(true);
    } catch {
      // Ошибка
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Настройки</h1>

      {/* Профиль */}
      <div className="card">
        <h3 className="font-semibold text-slate-900 mb-4">Личные данные</h3>

        {profileSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Данные обновлены
          </div>
        )}

        <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={user?.email || ''} disabled className="input-field bg-slate-50 text-slate-500" />
            <p className="mt-1 text-xs text-slate-400">Email нельзя изменить</p>
          </div>

          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-slate-700 mb-1">Имя</label>
            <input id="settings-name" type="text" className="input-field" placeholder="Как вас зовут" {...register('name')} />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>

      <ChangePasswordForm />
      <SessionsList />
    </div>
  );
}
