import { Module } from '@nestjs/common';
import { BOService } from './bo.service';
import { BOController } from './bo.controller';
import { BOInterfaceService } from './bo-interface.service';
import { EnhancedBOInterfaceService } from './enhanced-bo-interface.service';
import { EnhancedBOInterfaceController } from './enhanced-bo-interface.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [BOController, EnhancedBOInterfaceController],
  providers: [BOService, BOInterfaceService, EnhancedBOInterfaceService, PrismaService],
  exports: [BOService, BOInterfaceService, EnhancedBOInterfaceService],
})
export class BOModule {}