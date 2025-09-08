import { Module, forwardRef } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { AdherentService } from './adherent.service';
import { DonneurOrdreService } from './donneur-ordre.service';
import { ExcelImportService } from './excel-import.service';
import { FileGenerationService } from './file-generation.service';
import { OrdreVirementService } from './ordre-virement.service';
import { FinanceIntegrationService } from './finance-integration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, forwardRef(() => WorkflowModule)],
  controllers: [FinanceController],
  providers: [
    AdherentService,
    DonneurOrdreService,
    ExcelImportService,
    FileGenerationService,
    OrdreVirementService,
    FinanceIntegrationService
  ],
  exports: [
    AdherentService,
    DonneurOrdreService,
    OrdreVirementService,
    FinanceIntegrationService
  ]
})
export class FinanceModule {}