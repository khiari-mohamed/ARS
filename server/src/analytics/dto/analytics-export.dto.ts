import { IsOptional, IsString, IsDateString } from 'class-validator';

export class AnalyticsExportDto {
  @IsOptional()
  @IsString()
  format?: 'csv' | 'excel' | 'pdf';

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
