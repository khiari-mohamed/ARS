import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum AlertType {
  SLA_BREACH = 'SLA_BREACH',
  PERFORMANCE = 'PERFORMANCE', 
  WORKLOAD = 'WORKLOAD',
  CLAIM = 'CLAIM',
  SYSTEM = 'SYSTEM'
}

export enum AlertLevel {
  GREEN = 'green',
  ORANGE = 'orange', 
  RED = 'red'
}

export class CreateAlertDto {
  @IsOptional()
  @IsString()
  bordereauId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsEnum(AlertType)
  alertType: AlertType;

  @IsEnum(AlertLevel)
  alertLevel: AlertLevel;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}