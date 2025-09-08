import { Module, forwardRef } from '@nestjs/common';
import { GedService } from './ged.service';
import { GedController } from './ged.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { PaperStreamIntegrationService } from './paperstream-integration.service';
import { PaperStreamBatchProcessor } from './paperstream-batch-processor.service';
import { PaperStreamWatcherService } from './paperstream-watcher.service';
import { AdvancedSearchService } from './advanced-search.service';
import { IntegrationModule } from '../integrations/integration.module';
import { BordereauxModule } from '../bordereaux/bordereaux.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [IntegrationModule, forwardRef(() => BordereauxModule), AlertsModule],
  controllers: [GedController],
  providers: [GedService, PrismaService, NotificationService, PaperStreamIntegrationService, PaperStreamBatchProcessor, PaperStreamWatcherService, AdvancedSearchService],
  exports: [GedService, NotificationService, PaperStreamIntegrationService, PaperStreamBatchProcessor, PaperStreamWatcherService, AdvancedSearchService],
})
export class GedModule {}
