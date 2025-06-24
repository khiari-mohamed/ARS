import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class CreateContractDto {
  @IsNotEmpty()
  @IsString()
  clientId: string;

  @IsNotEmpty()
  @IsString()
  clientName: string;

  @IsNotEmpty()
  @IsInt()
  delaiReglement: number;

  @IsNotEmpty()
  @IsInt()
  delaiReclamation: number;

  @IsOptional()
  @IsInt()
  escalationThreshold?: number;

  @IsOptional()
  @IsString()
  documentPath?: string;

  @IsNotEmpty()
  @IsString()
  assignedManagerId: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string; // ISO string

  @IsNotEmpty()
  @IsDateString()
  endDate: string; // ISO string

  @IsOptional()
  @IsDateString()
  signatureDate?: string; // ISO string
}
