import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtRefreshPayload } from '../../../common/interfaces/jwt-payload.interface';
import { RequestUser } from '../../../common/interfaces/request-with-user.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        const cookieName = configService.get<string>('auth.refreshTokenCookieName', 'refresh_token');
        return req?.cookies?.[cookieName] || null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtRefreshSecret'),
    });
  }

  validate(payload: JwtRefreshPayload): RequestUser {
    if (!payload.sub || !payload.sessionId) {
      throw new UnauthorizedException();
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  }
}
