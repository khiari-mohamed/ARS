import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';

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
  @IsString()
  startDate: string; // ISO string

  @IsNotEmpty()
  @IsString()
  endDate: string; // ISO string

  @IsOptional()
  @IsString()
  signatureDate?: string; // ISO string
}
