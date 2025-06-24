import { IsOptional, IsString, IsInt, IsDateString } from 'class-validator';

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsInt()
  delaiReglement?: number;

  @IsOptional()
  @IsInt()
  delaiReclamation?: number;

  @IsOptional()
  @IsInt()
  escalationThreshold?: number;

  @IsOptional()
  @IsString()
  documentPath?: string;

  @IsOptional()
  @IsString()
  assignedManagerId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  signatureDate?: string;
}
