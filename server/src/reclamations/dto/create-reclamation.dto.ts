import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateReclamationDto {
  @IsNotEmpty()
  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  documentId?: string;
  
  @IsOptional()
  @IsString()
  department?: string;
  
  @IsOptional()
  @IsString()
  contractId?: string;
  
  @IsOptional()
  @IsString()
  processId?: string;

  @IsOptional()
  @IsString()
  bordereauId?: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  severity: string; // low, medium, critical

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
  @IsOptional()
  @IsString()
  evidencePath?: string;

  
}
