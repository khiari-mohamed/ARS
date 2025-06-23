// D:\ARS\server\src\client\dto\client-analytics.dto.ts
import { IsString } from 'class-validator';

export class ClientAnalyticsDto {
  @IsString()
  clientId: string;
}