import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.get<string>('role', context.getHandler());
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const { user } = context.switchToHttp().getRequest();

    if (requiredRoles) {
      if (!user || !requiredRoles.includes(user.role)) {
        throw new ForbiddenException('Insufficient role');
      }
      return true;
    }

    if (requiredRole) {
      if (!user || user.role !== requiredRole) {
        throw new ForbiddenException('Insufficient role');
      }
      return true;
    }

    return true;
  }
}