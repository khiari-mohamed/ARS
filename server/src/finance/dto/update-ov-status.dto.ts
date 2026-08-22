import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum OVStatus {
  NON_EXECUTE = 'NON_EXECUTE',
  EN_COURS_VALIDATION = 'EN_COURS_VALIDATION',
  VIREMENT_DEPOSE = 'VIREMENT_DEPOSE',
  VIREMENT_NON_VALIDE = 'VIREMENT_NON_VALIDE',
  VIREMENT_AUTORISE = 'VIREMENT_AUTORISE',
  BLOQUE = 'BLOQUE',
  EXECUTE = 'EXECUTE',
  REJETE = 'REJETE'
}

export class UpdateOVStatusDto {
  @IsNotEmpty()
  @IsEnum(OVStatus)
  status!: OVStatus;

  @IsOptional()
  @IsString()
  dateExecuted?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsNotEmpty()
  @IsString()
  updatedBy!: string;
}