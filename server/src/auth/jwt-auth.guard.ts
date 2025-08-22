import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      console.log('JWT Guard: No user found', { err, user, info });
      throw err || new UnauthorizedException();
    }
    
    // Ensure SUPER_ADMIN role is properly set
    if (user && (user.role === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN')) {
      user.role = 'SUPER_ADMIN';
    }
    
    return user;
  }
}