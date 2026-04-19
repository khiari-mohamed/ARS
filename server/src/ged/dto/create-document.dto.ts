import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  type!: string; // e.g. BS, reçu, contrat

  @IsOptional()
  @IsString()
  bordereauId?: string;
}
