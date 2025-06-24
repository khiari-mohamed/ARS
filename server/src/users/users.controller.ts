import { Controller, Get, Param, UseGuards, Post, Body, Put, Delete, Patch, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../auth/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get()
  async getAllUsers() {
    const users = await this.usersService.findAll();
    return users.map(({ password, ...rest }) => rest);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id).then(user => {
      if (!user) return null;
      const { password, ...rest } = user;
      return rest;
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  async createUser(@Body() body: { email: string; password: string; fullName: string; role: string }) {
    // Validate input
    if (!body.email || !body.password || !body.fullName || !body.role) {
      throw new Error('All fields (email, password, fullName, role) are required.');
    }
    // Check for existing user
    const existing = await this.usersService.findByEmail(body.email);
    if (existing) {
      throw new Error('A user with this email already exists.');
    }
    // Hash password
    const bcrypt = require('bcrypt');
    const hashed = await bcrypt.hash(body.password, 10);
    const user = await this.usersService.create({ ...body, password: hashed });
    return { ...user, password: undefined };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: Partial<{ email: string; password: string; fullName: string; role: string }>
  ) {
    return this.usersService.update(id, body).then(({ password, ...rest }) => rest);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id).then(({ password, ...rest }) => rest);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get(':id/audit-logs')
  async getUserAuditLogs(@Param('id') id: string) {
    return this.usersService.getAuditLogsForUser(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id/disable')
  async disableUser(@Param('id') id: string) {
    return this.usersService.disableUser(id).then(({ password, ...rest }) => rest);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post(':id/reset-password')
  async resetUserPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.usersService.resetPassword(id, body.password).then(({ password, ...rest }) => rest);
  }
}