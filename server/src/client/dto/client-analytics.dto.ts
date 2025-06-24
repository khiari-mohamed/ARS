// D:\ARS\server\src\client\dto\client-analytics.dto.ts
import { IsString, IsOptional, IsObject } from 'class-validator';

export class ClientAnalyticsDto {
  @IsString()
  clientId: string;

  @IsOptional()
  @IsObject()
  slaConfig?: any; // For analytics on SLA config if needed
}