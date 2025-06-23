import { Module } from '@nestjs/common';
import { BordereauxService } from './bordereaux.service';
import { BordereauxController } from './bordereaux.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AuditLogModule } from './audit-log.module'; 
import { SeedController } from '../seed.controller';
@Module({
  imports: [PrismaModule , AlertsModule , AuditLogModule],
  controllers: [BordereauxController , SeedController],
  providers: [BordereauxService],
  exports: [BordereauxService],
})
export class BordereauxModule {}