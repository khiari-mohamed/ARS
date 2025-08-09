import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum OVStatus {
  NON_EXECUTE = 'NON_EXECUTE',
  EN_COURS = 'EN_COURS',
  PARTIELLEMENT_EXECUTE = 'PARTIELLEMENT_EXECUTE',
  REJETE = 'REJETE',
  EXECUTE = 'EXECUTE'
}

export class UpdateOVStatusDto {
  @IsNotEmpty()
  @IsEnum(OVStatus)
  status: OVStatus;

  @IsOptional()
  @IsString()
  dateExecuted?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsNotEmpty()
  @IsString()
  updatedBy: string;
}