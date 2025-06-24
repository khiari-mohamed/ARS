import { IsUUID, IsEnum, IsOptional, IsDateString, IsString, IsNumber } from 'class-validator';

export enum BSStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
}
// Only allow these statuses for transitions
export const ALLOWED_BS_STATUSES = [BSStatus.IN_PROGRESS, BSStatus.VALIDATED, BSStatus.REJECTED];

export class CreateBSDto {
  @IsUUID()
  bordereauId: string;

  @IsUUID()
  ownerId: string;

  @IsEnum(BSStatus)
  status: BSStatus;

  @IsOptional()
  @IsDateString()
  processedAt?: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;
  numBs: string;
  etat: string;
  nomAssure: string;
  nomBeneficiaire: string;
  nomSociete: string;
  codeAssure: string;
  matricule: any;
  dateSoin: any;
  montant: any;
  acte: any;

  @IsString()
  nomPrestation: string;

  @IsString()
  nomBordereau: string;

  @IsString()
  lien: string;

  @IsDateString()
  dateCreation: string;

  @IsDateString()
  dateMaladie: string;

  @IsNumber()
  totalPec: number;

  @IsString()
  observationGlobal: string;
}

export class UpdateBSDto {
  etat(etat: any) {
    throw new Error('Method not implemented.');
  }
  @IsEnum(BSStatus)
  @IsOptional()
  status?: BSStatus;

  @IsOptional()
  @IsDateString()
  processedAt?: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;


   @IsString()
  nomPrestation: string;

  @IsString()
  nomBordereau: string;

  @IsString()
  lien: string;

  @IsDateString()
  dateCreation: string;

  @IsDateString()
  dateMaladie: string;

  @IsNumber()
  totalPec: number;
 @IsString()
  observationGlobal: string;
}

