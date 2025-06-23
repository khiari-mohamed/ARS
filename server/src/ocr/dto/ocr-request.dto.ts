import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class OcrRequestDto {
  @IsNotEmpty()
  @IsString()
  documentId: string;

  @IsOptional()
  @IsString()
  documentType?: string; // e.g. BS, reçu, contrat
}
