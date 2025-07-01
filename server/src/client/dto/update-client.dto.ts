import { IsOptional, IsString, IsInt, IsObject, IsArray } from 'class-validator';

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
  @IsArray()
  @IsString({ each: true })
  gestionnaireIds?: string[];

  @IsOptional()
  @IsObject()
  slaConfig?: any; // For alert threshold/SLA config

  @IsOptional()
  accountManager?: any;

  @IsOptional()
  contracts?: any;

  @IsOptional()
  bordereaux?: any;

  @IsOptional()
  reclamations?: any;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  @IsOptional()
  id?: any;
}
