import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export enum CourrierType {
  REGLEMENT = 'REGLEMENT',
  RELANCE = 'RELANCE',
  RECLAMATION = 'RECLAMATION',
  AUTRE = 'AUTRE',
}

export class CreateCourrierDto {
  @IsNotEmpty()
  @IsString()
  subject: string;

  @IsNotEmpty()
  @IsString()
  body: string;

  @IsNotEmpty()
  @IsEnum(CourrierType)
  type: CourrierType;

  @IsNotEmpty()
  @IsString()
  templateUsed: string;

  @IsOptional()
  @IsString()
  bordereauId?: string;
}
