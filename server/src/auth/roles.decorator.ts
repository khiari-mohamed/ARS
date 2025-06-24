import { SetMetadata } from '@nestjs/common';
import { UserRole } from './user-role.enum';

/**
 * Decorator to set required roles for a route or controller.
 * Usage: @Roles(UserRole.SUPER_ADMIN, UserRole.CHEF_EQUIPE)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);