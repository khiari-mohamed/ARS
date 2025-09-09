import { Body, Controller, Post, Get, Req, UseGuards, Param, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PermissionMatrixService } from './permission-matrix.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionMatrix: PermissionMatrixService
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    const result = await this.authService.login(user);
    return {
      access_token: result.access_token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    return this.authService.getUserById(req.user.id);
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

  @Get('permissions/:userRole')
  async getUserPermissions(@Param('userRole') userRole: string) {
    return this.permissionMatrix.getUserPermissions(userRole);
  }

  @Get('permissions/check')
  async checkPermission(
    @Query('userRole') userRole: string,
    @Query('module') module: string,
    @Query('action') action: string
  ) {
    return { hasPermission: this.permissionMatrix.hasPermission(userRole, module, action) };
  }

  @Get('permissions')
  async getAllPermissions() {
    return this.permissionMatrix.getAllPermissions();
  }

  @Get('permissions/module/:module')
  async getModulePermissions(@Param('module') module: string) {
    return this.permissionMatrix.getModulePermissions(module);
  }
}