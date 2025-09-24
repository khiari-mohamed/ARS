import { Controller, Get, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../auth/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bordereaux/chef-equipe')
export class ChefEquipeDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('gestionnaire-assignments')
  @Roles(UserRole.CHEF_EQUIPE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMIN)
  async getGestionnaireAssignments(@Req() req) {
    const gestionnaires = await this.prisma.user.findMany({
      where: { role: 'GESTIONNAIRE' },
      select: {
        id: true,
        fullName: true,
        _count: {
          select: {
            assignedDocuments: {
              where: {
                bordereau: { archived: false }
              }
            },
            bordereauxCurrentHandler: {
              where: { 
                archived: false,
                statut: { in: ['ASSIGNE', 'EN_COURS'] }
              }
            }
          }
        }
      }
    });

    const assignments = await Promise.all(
      gestionnaires.map(async (gestionnaire) => {
        const [assignedDocs, returnedDocs, assignedBordereaux] = await Promise.all([
          this.prisma.document.count({
            where: {
              assignedToUserId: gestionnaire.id,
              bordereau: { archived: false }
            }
          }),
          this.prisma.documentAssignmentHistory.count({
            where: {
              fromUserId: gestionnaire.id,
              action: 'RETURNED'
            }
          }),
          this.prisma.bordereau.count({
            where: {
              assignedToUserId: gestionnaire.id,
              archived: false,
              statut: { in: ['ASSIGNE', 'EN_COURS'] }
            }
          })
        ]);

        const docsByType = await this.prisma.document.groupBy({
          by: ['type'],
          where: {
            assignedToUserId: gestionnaire.id,
            bordereau: { archived: false }
          },
          _count: { id: true }
        });

        const typeBreakdown = {};
        docsByType.forEach(group => {
          typeBreakdown[group.type] = group._count.id;
        });

        return {
          gestionnaire: gestionnaire.fullName,
          totalAssigned: assignedDocs + assignedBordereaux,
          documentsAssigned: assignedDocs,
          bordereauxAssigned: assignedBordereaux,
          documentsReturned: returnedDocs,
          typeBreakdown
        };
      })
    );

    return assignments;
  }
}