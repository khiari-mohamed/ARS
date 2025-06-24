import { IsOptional, IsString, IsInt, IsObject } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  reglementDelay?: number;

  @IsOptional()
  @IsInt()
  reclamationDelay?: number;

  @IsOptional()
  @IsString()
  accountManagerId?: string;

  @IsOptional()
  @IsObject()
  slaConfig?: any; // For alert threshold/SLA config
}
