import { IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export class SearchContractDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsOptional()
  @IsString()
  accountOwnerId?: string;

  @IsOptional()
  @IsString()
  status?: 'active' | 'expired' | 'expiring_soon' | 'all';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  hasDocument?: boolean;

  @IsOptional()
  @IsString()
  slaStatus?: 'compliant' | 'at_risk' | 'breach';
}
