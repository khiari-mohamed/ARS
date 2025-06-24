import { IsNotEmpty, IsString, IsInt, IsOptional, IsObject } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  reglementDelay: number;

  @IsNotEmpty()
  @IsInt()
  reclamationDelay: number;

  @IsNotEmpty()
  @IsString()
  accountManagerId: string;

  @IsOptional()
  @IsObject()
  slaConfig?: any; // For alert threshold/SLA config
}
