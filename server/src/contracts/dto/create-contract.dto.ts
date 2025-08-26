import { IsNotEmpty, IsString, IsInt, IsOptional, IsDateString, IsArray, IsObject, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractDto {
  @IsNotEmpty()
  @IsString()
  clientId: string;

  @IsNotEmpty()
  @IsString()
  contractNumber: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  treatmentDelay: number; // SLA Treatment delay

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  claimsReplyDelay: number; // SLA Claims reply delay

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  paymentDelay: number; // SLA Payment delay

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  warningThreshold?: number; // Alert warning threshold

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  criticalThreshold?: number; // Alert critical threshold

  @IsOptional()
  @IsArray()
  escalationChain?: string[]; // Array of user IDs for escalation

  @IsNotEmpty()
  @IsString()
  accountOwnerId: string; // Chargé de compte

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsObject()
  alertSettings?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    escalationEnabled: boolean;
  };

  @IsOptional()
  @IsString()
  notes?: string;
}
