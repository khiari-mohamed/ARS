import { Controller, Post, Body, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('workflow')
export class WorkflowCorbeilleController {
  constructor(private prisma: PrismaService) {}

  @Post('enhanced-corbeille/return-to-chef')
  async returnToChef(
    @Body() body: { bordereauId: string; reason: string },
    @Req() req: any
  ) {
    const userId = req.user?.sub || req.user?.id;
    const reclamationId = body.bordereauId;
    
    console.log(`Returning reclamation ${reclamationId} to chef by user ${userId}`);
    console.log('Reason:', body.reason);
    
    try {
      // Update reclamation status and clear assignment
      const updatedReclamation = await this.prisma.reclamation.update({
        where: { id: reclamationId },
        data: {
          status: 'ESCALATED',
          assignedToId: null
        }
      });
      
      // Add history entry
      await this.prisma.reclamationHistory.create({
        data: {
          reclamationId: reclamationId,
          userId: userId,
          action: 'RETURNED_TO_CHEF',
          fromStatus: updatedReclamation.status,
          toStatus: 'ESCALATED',
          description: `Returned to chef: ${body.reason}`
        }
      });
      
      console.log(`Successfully returned reclamation ${reclamationId} to chef`);
      return { success: true, message: 'Réclamation retournée au chef avec succès' };
    } catch (error) {
      console.error('Error returning to chef:', error);
      throw new Error('Erreur lors du retour au chef');
    }
  }
}