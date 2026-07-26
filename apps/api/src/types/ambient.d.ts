declare module '@sentry/node';
declare module 'passport-jwt';
declare module 'express' {
  export interface Response {
    redirect(url: string): void;
  }

  export interface Request {
    headers: Record<string, string | string[] | undefined>;
    body: unknown;
  }
}
