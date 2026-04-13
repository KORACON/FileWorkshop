import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../../../common/interfaces/request-with-user.interface';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (data) {
      return request.user?.[data as keyof typeof request.user];
    }
    return request.user;
  },
);
