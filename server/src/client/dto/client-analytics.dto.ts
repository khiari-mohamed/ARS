import { IsOptional, IsString, IsIn } from 'class-validator';

export class ClientAnalyticsDto {
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  period?: string = 'monthly';

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}

export class BulkImportResultDto {
  success: Array<{ line: number; name: string }>;
  errors: Array<{ line: number; error: string }>;
  total: number;
}

export class CommunicationLogDto {
  @IsString()
  type: string;

  @IsString()
  subject: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;
}

export class RiskThresholdsDto {
  @IsOptional()
  slaBreachThreshold?: number;

  @IsOptional()
  complaintVolumeThreshold?: number;

  @IsOptional()
  delayRateThreshold?: number;

  @IsOptional()
  volumeOverloadThreshold?: number;
}