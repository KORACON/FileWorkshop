import { create } from 'zustand';
import { api, setAccessToken } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Инициализация: пробуем refresh при загрузке приложения */
  initialize: () => Promise<void>;
  /** Вход */
  login: (email: string, password: string) => Promise<void>;
  /** Регистрация */
  register: (email: string, password: string, confirmPassword: string, name?: string) => Promise<void>;
  /** Выход */
  logout: () => Promise<void>;
  /** Обновление данных пользователя */
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      const res = await api.post<{ accessToken: string; user: User }>('/api/auth/refresh');
      setAccessToken(res.data.accessToken);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.post<{ accessToken: string; user: User }>('/api/auth/login', {
      email,
      password,
    });
    setAccessToken(res.data.accessToken);
    set({ user: res.data.user, isAuthenticated: true });
  },

  register: async (email, password, confirmPassword, name) => {
    const res = await api.post<{ accessToken: string; user: User }>('/api/auth/register', {
      email,
      password,
      confirmPassword,
      name,
    });
    setAccessToken(res.data.accessToken);
    set({ user: res.data.user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Игнорируем ошибку — всё равно очищаем состояние
    }
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
