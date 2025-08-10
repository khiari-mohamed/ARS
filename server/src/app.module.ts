import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContractsModule } from './contracts/contracts.module';
import { BordereauxModule } from './bordereaux/bordereaux.module';
import { TraitementModule } from './traitement/traitement.module';
import { ReclamationsModule } from './reclamations/reclamations.module';
import { GedModule } from './ged/ged.module';
import { GecModule } from './gec/gec.module';
import { FinanceModule } from './finance/finance.module';
import { OcrModule } from './ocr/ocr.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AlertsModule } from './alerts/alerts.module';
import { SharedModule } from './shared/shared.module';
import { ConfigModule } from './config/config.module';
import { ClientModule } from './client/client.module';
// Import WorkflowModule
import { WorkflowModule } from './workflow/workflow.module';
// Import BO Module
import { BOModule } from './bo/bo.module';
// Import SCAN Module
import { ScanModule } from './scan/scan.module';
//new modules dahsboard w tun service ta3 l kpis 

import { DashboardModule } from './dashboard/dashboard.module';
import { IntegrationModule } from './integrations/integration.module';
import { SeedController } from './seed.controller';

@Module({
  imports: [AuthModule, UsersModule, ContractsModule, BordereauxModule, TraitementModule, ReclamationsModule, GedModule, GecModule, FinanceModule, OcrModule, AnalyticsModule, AlertsModule, SharedModule, ConfigModule,
        DashboardModule,
    IntegrationModule,
    ClientModule,
    WorkflowModule,
    BOModule,
    ScanModule
  ],
  controllers: [AppController , SeedController],
  providers: [AppService],
})
export class AppModule {}
