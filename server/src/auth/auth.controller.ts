import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; fullName: string; role: string }) {
    // Validate input
    if (!body.email || !body.password || !body.fullName || !body.role) {
      throw new Error('All fields (email, password, fullName, role) are required.');
    }
    return this.authService.register(body);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req) {
    return { message: 'Logged out' };
  }

  @Post('password-reset-request')
  async passwordResetRequest(@Body() body: { email: string }) {
    await this.authService.initiatePasswordReset(body.email);
    return { message: 'Password reset link sent if email exists.' };
  }

  @Post('password-reset-confirm')
  async passwordResetConfirm(@Body() body: { token: string; newPassword: string }) {
    await this.authService.confirmPasswordReset(body.token, body.newPassword);
    return { message: 'Password has been reset.' };
  }
}