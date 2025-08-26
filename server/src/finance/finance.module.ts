import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { OVGeneratorService } from './ov-generator.service';
import { MultiBankFormatService } from './multi-bank-format.service';
import { AutomatedReconciliationService } from './automated-reconciliation.service';
import { FinancialReportingService } from './financial-reporting.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    OVGeneratorService,
    MultiBankFormatService,
    AutomatedReconciliationService,
    FinancialReportingService
  ],
  exports: [FinanceService]
})
export class FinanceModule {}