import { Request } from 'express';

export interface RequestUser {
  id: string;
  email: string;
  role: string;
  sessionId?: string;
}

export interface RequestWithUser extends Request {
  user: RequestUser;
}
