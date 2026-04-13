export interface JwtPayload {
  sub: string;    // user id
  email: string;
  role: string;
}

export interface JwtRefreshPayload extends JwtPayload {
  sessionId: string;
}
