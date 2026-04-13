import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 4000);
  const frontendUrl = configService.get<string>('app.frontendUrl', 'http://localhost:3000');

  // Глобальный префикс API
  app.setGlobalPrefix('api');

  // Security headers
  app.use(helmet());

  // Cookie parser для refresh token
  app.use(cookieParser());

  // CORS — только свой frontend
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // Глобальная валидация DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Удаляет поля, не описанные в DTO
      forbidNonWhitelisted: true, // Ошибка при лишних полях
      transform: true,           // Автоматическое преобразование типов
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  Logger.log(`API запущен на порту ${port}`, 'Bootstrap');
}

bootstrap();
