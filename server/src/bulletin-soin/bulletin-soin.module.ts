import { Module } from '@nestjs/common';
import { BulletinSoinService } from './bulletin-soin.service';
import { BulletinSoinController } from './bulletin-soin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { IntegrationModule } from '../integrations/integration.module';

@Module({
  imports: [PrismaModule, AlertsModule, IntegrationModule],
  controllers: [BulletinSoinController],
  providers: [BulletinSoinService],
  exports: [BulletinSoinService],
})
export class BulletinSoinModule {}
