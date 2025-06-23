import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class SearchVirementDto {
  @IsOptional()
  @IsString()
  bordereauReference?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}
