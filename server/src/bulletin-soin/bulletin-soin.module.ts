import { Module } from '@nestjs/common';
import { BulletinSoinService } from './bulletin-soin.service';
import { BulletinSoinController } from './bulletin-soin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GedModule } from '../ged/ged.module';
import { OcrModule } from '../ocr/ocr.module';
import { AuthModule } from '../auth/auth.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [PrismaModule, GedModule, OcrModule, AuthModule, AlertsModule],
  controllers: [BulletinSoinController],
  providers: [BulletinSoinService],
  exports: [BulletinSoinService],
})
export class BulletinSoinModule {}
