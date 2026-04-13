import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, JwtRefreshPayload } from '../../common/interfaces/jwt-payload.interface';
import { RequestUser } from '../../common/interfaces/request-with-user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ──────────────────────────────────────────────
  // РЕГИСТРАЦИЯ
  // ──────────────────────────────────────────────

  async register(dto: RegisterDto, req: Request, res: Response) {
    const email = dto.email.toLowerCase().trim();

    // 1. Проверка уникальности email (на уровне сервиса)
    //    Дополнительно защищено UNIQUE INDEX в БД (race condition)
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // 2. Хэширование пароля через Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: this.configService.get<number>('auth.argon2MemoryCost', 65536),
      timeCost: this.configService.get<number>('auth.argon2TimeCost', 3),
      parallelism: this.configService.get<number>('auth.argon2Parallelism', 4),
    });

    // 3. Создание пользователя
    //    Если между проверкой и INSERT другой запрос создаст такой же email,
    //    Prisma выбросит P2002 (unique violation) → PrismaExceptionFilter вернёт 409
    const user = await this.usersService.create({
      email,
      passwordHash,
      name: dto.name,
    });

    // 4. Создание сессии и токенов
    const { accessToken, refreshToken } = await this.createSession(user.id, user.email, user.role, req);

    // 5. Установка refresh token в httpOnly cookie
    this.setRefreshCookie(res, refreshToken);

    // 6. Аудит
    await this.auditLogService.log({
      action: 'register',
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    this.logger.log(`Новый пользователь зарегистрирован: ${user.id}`);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // ──────────────────────────────────────────────
  // ВХОД
  // ──────────────────────────────────────────────

  async login(dto: LoginDto, req: Request, res: Response) {
    const email = dto.email.toLowerCase().trim();

    // 1. Поиск пользователя
    const user = await this.usersService.findByEmail(email);

    // Единое сообщение об ошибке — не раскрываем, что именно неверно (email или пароль)
    if (!user) {
      // Выполняем фиктивный hash чтобы timing attack не мог определить
      // существование email по времени ответа
      await argon2.hash('dummy-password', { type: argon2.argon2id });

      await this.auditLogService.log({
        action: 'login_failed',
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'user_not_found' },
      });

      throw new UnauthorizedException('Неверный email или пароль');
    }

    // 2. Проверка активности аккаунта
    if (!user.isActive) {
      await this.auditLogService.log({
        action: 'login_failed',
        userId: user.id,
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'account_disabled' },
      });

      throw new ForbiddenException('Аккаунт деактивирован');
    }

    // 3. Проверка пароля
    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      await this.auditLogService.log({
        action: 'login_failed',
        userId: user.id,
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'invalid_password' },
      });

      throw new UnauthorizedException('Неверный email или пароль');
    }

    // 4. Создание сессии
    const { accessToken, refreshToken } = await this.createSession(user.id, user.email, user.role, req);

    // 5. Cookie
    this.setRefreshCookie(res, refreshToken);

    // 6. Обновление last_login_at
    await this.usersService.updateLastLogin(user.id);

    // 7. Аудит
    await this.auditLogService.log({
      action: 'login',
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // ──────────────────────────────────────────────
  // ВЫХОД
  // ──────────────────────────────────────────────

  async logout(user: RequestUser, res: Response) {
    // Отзываем текущую сессию, если sessionId известен
    if (user.sessionId) {
      await this.prisma.userSession.update({
        where: { id: user.sessionId },
        data: { revokedAt: new Date() },
      }).catch(() => {
        // Сессия могла быть уже удалена — не критично
      });
    }

    // Очищаем cookie
    this.clearRefreshCookie(res);

    // Аудит
    await this.auditLogService.log({
      action: 'logout',
      userId: user.id,
      entityType: 'session',
      entityId: user.sessionId,
    });

    return { message: 'Выход выполнен' };
  }

  // ──────────────────────────────────────────────
  // ОБНОВЛЕНИЕ ТОКЕНОВ (REFRESH)
  // ──────────────────────────────────────────────

  async refreshTokens(user: RequestUser, res: Response) {
    // user уже провалидирован JwtRefreshStrategy (sessionId есть в payload)
    if (!user.sessionId) {
      throw new UnauthorizedException('Невалидная сессия');
    }

    // 1. Проверяем сессию в БД
    const session = await this.prisma.userSession.findUnique({
      where: { id: user.sessionId },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException('Сессия истекла или отозвана');
    }

    // 2. Проверяем, что пользователь всё ещё активен
    const dbUser = await this.usersService.findById(user.id);
    if (!dbUser || !dbUser.isActive) {
      await this.prisma.userSession.update({
        where: { id: user.sessionId },
        data: { revokedAt: new Date() },
      });
      this.clearRefreshCookie(res);
      throw new ForbiddenException('Аккаунт деактивирован');
    }

    // 3. Ротация: отзываем старую сессию
    //    Защита от replay attack — украденный старый refresh token
    //    станет невалидным после первого использования
    await this.prisma.userSession.update({
      where: { id: user.sessionId },
      data: { revokedAt: new Date() },
    });

    // 4. Создаём новую сессию (новый access + refresh token)
    //    Передаём фейковый req с IP/UA из старой сессии
    const fakeReq = {
      headers: { 'user-agent': session.userAgent || '' },
      ip: session.ipAddress,
      socket: { remoteAddress: session.ipAddress },
    } as unknown as Request;

    const { accessToken, refreshToken } = await this.createSession(
      dbUser.id, dbUser.email, dbUser.role, fakeReq,
    );

    // 5. Устанавливаем новый cookie
    this.setRefreshCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      },
    };
  }

  // ──────────────────────────────────────────────
  // ПРИВАТНЫЕ МЕТОДЫ
  // ──────────────────────────────────────────────

  /**
   * Создаёт сессию в БД и генерирует access + refresh токены.
   * Возвращает accessToken и sessionId (для refresh cookie).
   */
  /**
   * Создаёт сессию в БД и генерирует access + refresh токены.
   * Возвращает accessToken и refreshToken (для cookie).
   */
  private async createSession(
    userId: string,
    email: string,
    role: string,
    req: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = randomUUID();

    // Access token — короткоживущий, хранится в памяти на клиенте
    const accessPayload: JwtPayload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('auth.jwtAccessSecret'),
      expiresIn: this.configService.get<string>('auth.jwtAccessExpiresIn', '15m'),
    });

    // Refresh token — долгоживущий, хранится в httpOnly cookie
    // sessionId зашит в payload — при валидации проверяем сессию в БД
    const refreshPayload: JwtRefreshPayload = { sub: userId, email, role, sessionId };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('auth.jwtRefreshSecret'),
      expiresIn: this.configService.get<string>('auth.jwtRefreshExpiresIn', '7d'),
    });

    // Хэшируем refresh token перед сохранением в БД
    // Даже при утечке БД злоумышленник не сможет использовать токены
    const refreshTokenHash = this.hashToken(refreshToken);

    const refreshMaxAge = this.configService.get<number>(
      'auth.refreshTokenCookieMaxAge',
      7 * 24 * 60 * 60 * 1000,
    );

    // Сохраняем сессию
    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash,
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent']?.substring(0, 512) || null,
        expiresAt: new Date(Date.now() + refreshMaxAge),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Устанавливает refresh token в httpOnly cookie.
   * Cookie доступна только для /api/auth/* — минимизация attack surface.
   * Принимает уже сгенерированный токен (тот же, чей хэш сохранён в БД).
   */
  private setRefreshCookie(res: Response, refreshToken: string) {
    const cookieName = this.configService.get<string>('auth.refreshTokenCookieName', 'refresh_token');
    const maxAge = this.configService.get<number>('auth.refreshTokenCookieMaxAge', 7 * 24 * 60 * 60 * 1000);
    const isProduction = this.configService.get<string>('app.nodeEnv') === 'production';

    res.cookie(cookieName, refreshToken, {
      httpOnly: true,                              // Недоступна из JavaScript
      secure: isProduction,                        // Только HTTPS в production
      sameSite: isProduction ? 'strict' : 'lax',   // Защита от CSRF
      maxAge,                                       // Время жизни cookie
      path: '/api/auth',                           // Только для auth endpoints
    });
  }

  /** Очищает refresh cookie */
  private clearRefreshCookie(res: Response) {
    const cookieName = this.configService.get<string>('auth.refreshTokenCookieName', 'refresh_token');
    res.clearCookie(cookieName, { path: '/api/auth' });
  }

  /**
   * SHA-256 хэш токена для хранения в БД.
   * Не используем Argon2 для refresh token — SHA-256 достаточен,
   * т.к. refresh token уже криптографически случайный (JWT).
   * Argon2 нужен для паролей, которые могут быть слабыми.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Извлекает IP клиента с учётом proxy (X-Forwarded-For) */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  // ──────────────────────────────────────────────
  // УПРАВЛЕНИЕ СЕССИЯМИ (для профиля)
  // ──────────────────────────────────────────────

  /** Получить все активные сессии пользователя */
  async getActiveSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Отозвать конкретную сессию */
  async revokeSession(sessionId: string, userId: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      return; // Молча игнорируем — не раскрываем информацию
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /** Отозвать все сессии пользователя (кроме текущей) */
  async revokeAllSessions(userId: string, exceptSessionId?: string) {
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: { revokedAt: new Date() },
    });
  }
}
