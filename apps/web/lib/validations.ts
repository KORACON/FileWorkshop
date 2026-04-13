import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Некорректный формат email'),
  password: z
    .string()
    .min(1, 'Пароль обязателен'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Некорректный формат email'),
  password: z
    .string()
    .min(8, 'Минимум 8 символов')
    .max(128, 'Максимум 128 символов')
    .regex(/(?=.*[a-z])/, 'Нужна строчная буква')
    .regex(/(?=.*[A-Z])/, 'Нужна заглавная буква')
    .regex(/(?=.*\d)/, 'Нужна цифра'),
  confirmPassword: z
    .string()
    .min(1, 'Подтвердите пароль'),
  name: z
    .string()
    .max(100, 'Максимум 100 символов')
    .optional()
    .or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Текущий пароль обязателен'),
  newPassword: z
    .string()
    .min(8, 'Минимум 8 символов')
    .regex(/(?=.*[a-z])/, 'Нужна строчная буква')
    .regex(/(?=.*[A-Z])/, 'Нужна заглавная буква')
    .regex(/(?=.*\d)/, 'Нужна цифра'),
  confirmNewPassword: z
    .string()
    .min(1, 'Подтвердите пароль'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmNewPassword'],
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .max(100, 'Максимум 100 символов')
    .optional()
    .or(z.literal('')),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
