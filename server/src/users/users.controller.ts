import { Controller, Get, Param, UseGuards, Post, Body, Put, Delete, Patch, Request, Query, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../auth/user-role.enum';

function canManageUser(currentRole: string, targetRole: string): boolean {
  const roleHierarchy = {
    'SUPER_ADMIN': 10,
    'ADMINISTRATEUR': 8,
    'RESPONSABLE_DEPARTEMENT': 6,
    'CHEF_EQUIPE': 5,
    'GESTIONNAIRE': 3,
    'CLIENT_SERVICE': 3,
    'FINANCE': 3,
    'SCAN_TEAM': 2,
    'BO': 2
  };
  
  return (roleHierarchy[currentRole] || 0) > (roleHierarchy[targetRole] || 0);
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE, UserRole.BO)
  async getAllUsers(@Request() req, @Query() query: any) {
    try {
      const filters = {
        role: query.role,
        department: query.department,
        active: query.active !== undefined ? query.active === 'true' : undefined,
        search: query.search
      };
      
      const users = await this.usersService.findAll(filters);
      
      // Return users without password
      return users.map(({ password, ...user }) => user);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  @Get('gestionnaires')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR, UserRole.CHEF_EQUIPE)
  async getGestionnaires(@Request() req) {
    try {
      const filters = {
        role: 'GESTIONNAIRE',
        active: true
      };
      
      const users = await this.usersService.findAll(filters);
      
      // Return users without password
      return users.map(({ password, ...user }) => user);
    } catch (error) {
      console.error('Error fetching gestionnaires:', error);
      return [];
    }
  }

  @Get('chef-equipes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async getChefEquipes(@Request() req) {
    try {
      const filters = {
        role: 'CHEF_EQUIPE',
        active: true
      };
      
      const users = await this.usersService.findAll(filters);
      
      // Return users without password
      return users.map(({ password, ...user }) => user);
    } catch (error) {
      console.error('Error fetching chef equipes:', error);
      return [];
    }
  }

  @Get('count-active')
  async getActiveUsersCount() {
    return this.usersService.countActiveUsers();
  }

  @Get('dashboard/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async getDashboardStats(@Request() req) {
    const user = req.user;
    return this.usersService.getDashboardStats(user.role, user.id);
  }

  @Get(':id')
  async getUser(@Param('id') id: string, @Request() req) {
    const user = await this.usersService.findById(id);
    if (!user) return null;
    
    // Check if current user can view this user
    const currentUser = req.user;
    if (currentUser.id !== id && !canManageUser(currentUser.role, user.role)) {
      throw new ForbiddenException('Access denied');
    }
    
    const { password, ...rest } = user;
    return rest;
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async createUser(@Body() createUserDto: any, @Request() req) {
    const currentUser = req.user;
    
    // Validate required fields
    if (!createUserDto.email || !createUserDto.password || !createUserDto.fullName || !createUserDto.role) {
      throw new BadRequestException('All fields (email, password, fullName, role) are required.');
    }
    
    // Check if current user can create user with this role
    if (currentUser.role !== 'SUPER_ADMIN' && !canManageUser(currentUser.role, createUserDto.role)) {
      throw new ForbiddenException('You cannot create a user with this role');
    }
    
    try {
      const user = await this.usersService.create(createUserDto, currentUser.id);
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw new BadRequestException('A user with this email already exists');
      }
      throw new BadRequestException(error.message || 'Failed to create user');
    }
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: any,
    @Request() req
  ) {
    const currentUser = req.user;
    const targetUser = await this.usersService.findById(id);
    
    // Check permissions
    if (!canManageUser(currentUser.role, targetUser.role)) {
      throw new ForbiddenException('You cannot modify this user');
    }
    
    const user = await this.usersService.update(id, updateUserDto, currentUser.id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async deleteUser(@Param('id') id: string, @Request() req) {
    console.log('DELETE USER REQUEST:', { id, currentUser: req.user });
    const currentUser = req.user;
    const user = await this.usersService.delete(id, currentUser.id);
    console.log('USER DELETED:', { id, active: user.active });
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch(':id/disable')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async disableUser(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    const user = await this.usersService.disableUser(id, currentUser.id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Patch(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async activateUser(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    const user = await this.usersService.enableUser(id, currentUser.id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Post(':id/reset-password')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async resetUserPassword(@Param('id') id: string, @Body() body: { password: string }, @Request() req) {
    const currentUser = req.user;
    const user = await this.usersService.resetPassword(id, body.password, currentUser.id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Get(':id/audit-logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async getUserAuditLogs(@Param('id') id: string) {
    return this.usersService.getAuditLogsForUser(id);
  }

  @Get(':id/performance')
  async getUserPerformance(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    
    // Users can view their own performance, managers can view their team's
    if (currentUser.id !== id) {
      const targetUser = await this.usersService.findById(id);
      if (!canManageUser(currentUser.role, targetUser.role)) {
        throw new ForbiddenException('Access denied');
      }
    }
    
    return this.usersService.getUserPerformanceStats(id);
  }

  @Get(':id/activity')
  async getUserActivity(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    
    // Users can view their own activity, managers can view their team's
    if (currentUser.id !== id) {
      const targetUser = await this.usersService.findById(id);
      if (!canManageUser(currentUser.role, targetUser.role)) {
        throw new ForbiddenException('Access denied');
      }
    }
    
    return this.usersService.getUserActivitySummary(id);
  }

  @Post('bulk-action')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async bulkUserAction(@Body() body: { userIds: string[]; action: string; data?: any }, @Request() req) {
    const currentUser = req.user;
    return this.usersService.performBulkAction(body.userIds, body.action, body.data, currentUser.id);
  }

  @Post('export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMINISTRATEUR)
  async exportUsers(@Body() body: { userIds: string[]; format?: 'csv' | 'excel' }) {
    const data = await this.usersService.exportUsers(body.userIds, body.format);
    
    if (body.format === 'excel') {
      // Return Excel format (would need additional library like xlsx)
      return data;
    }
    
    // Return CSV format
    const headers = ['ID', 'Nom', 'Email', 'Rôle', 'Département', 'Actif', 'Créé le', 'Bordereaux', 'Réclamations'];
    const rows = data.map(user => [
      user.id,
      user.fullName,
      user.email,
      user.role,
      user.department || '',
      user.active ? 'Oui' : 'Non',
      new Date(user.createdAt).toLocaleDateString(),
      user.bordereauxCount,
      user.reclamationsCount
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    return { csv };
  }

  @Get(':id/notifications')
  async getUserNotifications(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    
    // Users can only view their own notifications
    if (currentUser.id !== id && currentUser.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied');
    }
    
    return this.usersService.getUserNotifications(id);
  }
  
  @Patch(':id/notifications/:notificationId/read')
  async markNotificationAsRead(
    @Param('id') userId: string,
    @Param('notificationId') notificationId: string,
    @Request() req
  ) {
    const currentUser = req.user;
    
    // Users can only mark their own notifications as read
    if (currentUser.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    
    return this.usersService.markNotificationAsRead(userId, notificationId);
  }
  
  @Patch(':id/notifications/mark-all-read')
  async markAllNotificationsAsRead(@Param('id') userId: string, @Request() req) {
    const currentUser = req.user;
    
    // Users can only mark their own notifications as read
    if (currentUser.id !== userId) {
      throw new ForbiddenException('Access denied');
    }
    
    return this.usersService.markAllNotificationsAsRead(userId);
  }
}