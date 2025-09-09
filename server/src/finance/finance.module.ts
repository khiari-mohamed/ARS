import { Module, forwardRef } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { AdherentService } from './adherent.service';
import { DonneurOrdreService } from './donneur-ordre.service';
import { ExcelImportService } from './excel-import.service';
import { FileGenerationService } from './file-generation.service';
import { OrdreVirementService } from './ordre-virement.service';
import { FinanceIntegrationService } from './finance-integration.service';
import { ExcelValidationService } from './excel-validation.service';
import { PdfGenerationService } from './pdf-generation.service';
import { TxtGenerationService } from './txt-generation.service';
import { SuiviVirementService } from './suivi-virement.service';
import { SuiviVirementController } from './suivi-virement.controller';
import { BankFormatConfigService } from './bank-format-config.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, forwardRef(() => WorkflowModule)],
  controllers: [FinanceController, SuiviVirementController],
  providers: [
    FinanceService,
    AdherentService,
    DonneurOrdreService,
    ExcelImportService,
    FileGenerationService,
    OrdreVirementService,
    FinanceIntegrationService,
    ExcelValidationService,
    PdfGenerationService,
    TxtGenerationService,
    SuiviVirementService,
    BankFormatConfigService
  ],
  exports: [
    AdherentService,
    DonneurOrdreService,
    OrdreVirementService,
    FinanceIntegrationService,
    SuiviVirementService
  ]
})
export class FinanceModule {}