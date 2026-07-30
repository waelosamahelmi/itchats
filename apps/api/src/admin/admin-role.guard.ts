import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const role = context.switchToHttp().getRequest()?.user?.role;
    if (role !== 'admin') throw new ForbiddenException('Admin access required');
    return true;
  }
}
