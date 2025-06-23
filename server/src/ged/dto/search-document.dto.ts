import { IsOptional, IsString, IsDateString } from 'class-validator';

export class SearchDocumentDto {
  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  prestataire?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  uploadedAfter?: string;

  @IsOptional()
  @IsDateString()
  uploadedBefore?: string;

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsString()
  bordereauReference?: string;
}
