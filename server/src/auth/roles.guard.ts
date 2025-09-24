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

    // ADMINISTRATEUR and RESPONSABLE_DEPARTEMENT have same view as SUPER_ADMIN but READ-ONLY
    // This is enforced at the service/controller level, not here
    if (user.role === 'ADMINISTRATEUR' || user.role === 'RESPONSABLE_DEPARTEMENT') {
      // Mark as read-only in request for downstream processing
      request.isReadOnly = true;
    }

    // SERVICE_CLIENT treated as GESTIONNAIRE with read-only restrictions
    if (user.role === 'SERVICE_CLIENT') {
      request.isReadOnly = true;
      request.effectiveRole = 'GESTIONNAIRE';
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