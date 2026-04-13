import {
  ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ошибка базы данных';
    let code = 'DATABASE_ERROR';

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = (exception.meta?.target as string[])?.join(', ') || 'поле';
        status = HttpStatus.CONFLICT;
        message = `Запись с таким значением ${target} уже существует`;
        code = 'UNIQUE_VIOLATION';
        break;
      }
      case 'P2025':
        // Record not found
        status = HttpStatus.NOT_FOUND;
        message = 'Запись не найдена';
        code = 'NOT_FOUND';
        break;
      case 'P2003':
        // Foreign key constraint
        status = HttpStatus.BAD_REQUEST;
        message = 'Нарушение ссылочной целостности';
        code = 'FOREIGN_KEY_VIOLATION';
        break;
      default:
        this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);
    }

    response.status(status).json({
      success: false,
      error: { code, message, statusCode: status },
    });
  }
}
