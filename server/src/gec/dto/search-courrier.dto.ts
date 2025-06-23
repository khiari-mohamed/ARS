import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { CourrierType } from './create-courrier.dto';

export enum CourrierStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  FAILED = 'FAILED',
  PENDING_RESPONSE = 'PENDING_RESPONSE',
  RESPONDED = 'RESPONDED',
}

export class SearchCourrierDto {
  @IsOptional()
  @IsEnum(CourrierType)
  type?: CourrierType;

  @IsOptional()
  @IsEnum(CourrierStatus)
  status?: CourrierStatus;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  bordereauId?: string;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}
