import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Если контроллер уже вернул объект с success — не оборачиваем повторно
        if (data && typeof data === 'object' && 'success' in data) {
          return data as unknown as ApiResponse<T>;
        }
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
