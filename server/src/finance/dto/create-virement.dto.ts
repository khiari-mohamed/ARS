import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateVirementDto {
  @IsNotEmpty()
  @IsString()
  bordereauId: string;

  @IsNotEmpty()
  @IsNumber()
  montant: number;

  @IsNotEmpty()
  @IsString()
  referenceBancaire: string;

  @IsNotEmpty()
  @IsString()
  dateDepot: string; // ISO string

  @IsNotEmpty()
  @IsString()
  dateExecution: string; // ISO string
}
