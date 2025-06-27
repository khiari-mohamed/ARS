import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @IsNotEmpty()
  @IsString()
  clientId: string;

  @IsNotEmpty()
  @IsString()
  clientName: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  delaiReglement: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  delaiReclamation: number;

  @IsOptional()
  @Type(() => Number)
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
