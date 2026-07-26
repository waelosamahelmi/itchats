import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest(err: any, user: any) {
    return user ?? null;
  }
}
