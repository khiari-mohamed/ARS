import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET || 'verySecretKey';
    console.log('JWT Secret being used:', secret); // Log the secret being used
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
  console.log('JWT payload received:', payload); // Log the payload received
  return {
    id: payload.sub,
    userId: payload.sub, // for backward compatibility
    email: payload.email,
    role: payload.role,
  };
}
}