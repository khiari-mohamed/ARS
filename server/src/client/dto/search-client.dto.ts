import { IsOptional, IsString, IsObject } from 'class-validator';

export class SearchClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  accountManagerId?: string;

  @IsOptional()
  @IsObject()
  slaConfig?: any; // For filtering by SLA config if needed
}
