import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED', 
  RESOLVED = 'RESOLVED'
}

export class UpdateAlertDto {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  acknowledgedAt?: string;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string;
}