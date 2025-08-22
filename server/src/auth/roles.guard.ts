import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from './user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPER_ADMIN has access to everything - bypass all role checks
    if (user.role === 'SUPER_ADMIN' || user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      // Check if user role matches any of the required roles
      const hasRequiredRole = requiredRoles.some(role => 
        user.role === role || user.role === role.toString()
      );
      
      if (!hasRequiredRole) {
        throw new ForbiddenException(`User role '${user.role}' does not have access. Required: ${requiredRoles.join(', ')}`);
      }
      return true;
    }

    // If no roles are required, allow access
    return true;
  }
}