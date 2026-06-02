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
import { TxtParserService } from './txt-parser.service';
import { PdfGenerationService } from './pdf-generation.service';
import { TxtGenerationService } from './txt-generation.service';
import { SuiviVirementService } from './suivi-virement.service';
import { SuiviVirementController } from './suivi-virement.controller';
import { BankFormatConfigService } from './bank-format-config.service';
import { SlaConfigurationService } from './sla-configuration.service';
import { SlaController } from './sla-controller';
import { SlaIntegrationService } from './sla-integration.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { SageTxtGenerationService } from './sage-txt-generation.service';
import { SageApiIntegrationService } from './sage-api-integration.service';
import { StatutGlobalService } from './statut-global.service';// aded this sage new moduel 
import { RecouvrementService } from './recouvrement.service'; // NEW: Service Recouvrement 
@Module({
  imports: [PrismaModule, forwardRef(() => WorkflowModule)],
  controllers: [FinanceController, SuiviVirementController, SlaController],
  providers: [
    FinanceService,
    AdherentService,
    DonneurOrdreService,
    ExcelImportService,
    FileGenerationService,
    OrdreVirementService,
    FinanceIntegrationService,
    ExcelValidationService,
    TxtParserService,
    PdfGenerationService,
    TxtGenerationService,
    SuiviVirementService,
    BankFormatConfigService,
    SlaConfigurationService,
    SlaIntegrationService,
    SageTxtGenerationService, // new 
    SageApiIntegrationService, // NEW: SAGE API Integration
    StatutGlobalService, // NEW: Global status management
    RecouvrementService, // NEW: Service Recouvrement 
  ],
  exports: [
    AdherentService,
    DonneurOrdreService,
    OrdreVirementService,
    FinanceIntegrationService,
    SuiviVirementService,
    TxtParserService,
    SlaConfigurationService,
    SlaIntegrationService ,   
    SageTxtGenerationService, //new
    SageApiIntegrationService, // NEW: SAGE API Integration
    RecouvrementService, // NEW: Service Recouvrement
  ]
})
export class FinanceModule {}