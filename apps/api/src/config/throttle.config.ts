import { registerAs } from '@nestjs/config';

export default registerAs('throttle', () => ({
  auth: {
    ttl: 60000,   // 1 минута
    limit: 5,     // 5 попыток login/register в минуту
  },
  upload: {
    ttl: 60000,
    limit: 10,    // 10 загрузок в минуту
  },
  download: {
    ttl: 60000,
    limit: 30,    // 30 скачиваний в минуту
  },
  general: {
    ttl: 60000,
    limit: 100,   // 100 запросов в минуту
  },
}));
