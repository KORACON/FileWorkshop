import {
  Controller, Post, Get, Delete, Param,
  Body, Req, Res, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-with-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Rate limit: 5 запросов в минуту (защита от массовой регистрации)
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(dto, req, res);
  }

  /**
   * POST /api/auth/login
   * Rate limit: 5 запросов в минуту (защита от brute force)
   */
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, req, res);
  }

  /**
   * POST /api/auth/logout
   * Требует авторизации. Отзывает текущую сессию.
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(user, res);
  }

  /**
   * POST /api/auth/refresh
   * Обновляет access token используя refresh token из cookie.
   * Ротация: старый refresh token инвалидируется, выдаётся новый.
   */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refreshTokens(user, res);
  }

  /**
   * GET /api/auth/sessions
   * Список активных сессий текущего пользователя.
   */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@CurrentUser() user: RequestUser) {
    return this.authService.getActiveSessions(user.id);
  }

  /**
   * DELETE /api/auth/sessions/:id
   * Отзыв конкретной сессии.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.authService.revokeSession(sessionId, user.id);
    return { message: 'Сессия отозвана' };
  }

  /**
   * DELETE /api/auth/sessions
   * Отзыв всех сессий кроме текущей.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@CurrentUser() user: RequestUser) {
    await this.authService.revokeAllSessions(user.id, user.sessionId);
    return { message: 'Все остальные сессии отозваны' };
  }
}
