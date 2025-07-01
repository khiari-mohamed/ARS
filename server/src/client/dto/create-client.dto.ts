import { IsNotEmpty, IsString, IsInt, IsOptional, IsObject, IsArray, ArrayNotEmpty } from 'class-validator';

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

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  gestionnaireIds: string[];

  @IsOptional()
  @IsObject()
  slaConfig?: any; // For alert threshold/SLA config
}
