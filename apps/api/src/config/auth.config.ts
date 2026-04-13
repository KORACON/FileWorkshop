import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  refreshTokenCookieName: 'refresh_token',
  refreshTokenCookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней в мс
  argon2MemoryCost: 65536,
  argon2TimeCost: 3,
  argon2Parallelism: 4,
}));
