import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserRole, assertValidRole } from './user-role.enum';
import { isPasswordComplex, recordFailedAttempt, isLockedOut, resetLockout } from './password.utils';
import { randomBytes } from 'crypto';
import { addMinutes } from 'date-fns';

// Assume PrismaService is available for DB access
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private prisma: PrismaService, // Add PrismaService for DB access
  ) {}

  async validateUser(email: string, password: string) {
    if (isLockedOut(email)) {
      throw new ForbiddenException('Account locked due to too many failed attempts. Try again later.');
    }
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      resetLockout(email);
      const { password, ...result } = user;
      await this.usersService.logAction(user.id, 'LOGIN_SUCCESS');
      return result;
    }
    const locked = recordFailedAttempt(email);
    if (user) await this.usersService.logAction(user.id, 'LOGIN_FAIL');
    if (locked) throw new ForbiddenException('Account locked due to too many failed attempts.');
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    let expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    if (expiresIn.startsWith('"') && expiresIn.endsWith('"')) {
      expiresIn = expiresIn.slice(1, -1);
    }
    return {
      access_token: this.jwtService.sign(payload, { expiresIn }),
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
    };
  }

  async register(data: { email: string; password: string; fullName: string; role: string }) {
    assertValidRole(data.role);
    if (!isPasswordComplex(data.password)) {
      throw new BadRequestException('Password does not meet complexity requirements.');
    }
    // Check for existing user
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new BadRequestException('A user with this email already exists.');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.create({ ...data, password: hashedPassword });
    await this.usersService.logAction(user.id, 'REGISTER');
    return user;
  }

  // --- Password Reset Methods ---

  async initiatePasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return; // Don't reveal user existence

    const token = randomBytes(32).toString('hex');
    const expiresAt = addMinutes(new Date(), 30);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      }
    });

    // TODO: Send email with reset link (e.g., https://yourapp/reset?token=...)
    // Use nodemailer or Microsoft 365 API
    await this.usersService.logAction(user.id, 'PASSWORD_RESET_REQUEST', { token });
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    const reset = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }
    if (!isPasswordComplex(newPassword)) {
      throw new BadRequestException('Password does not meet complexity requirements.');
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { password: hashed }
    });
    await this.prisma.passwordResetToken.update({
      where: { token },
      data: { used: true }
    });
    await this.usersService.logAction(reset.userId, 'PASSWORD_RESET');
  }
}