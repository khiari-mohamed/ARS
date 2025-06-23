import { IsOptional, IsString } from 'class-validator';

export class SearchContractDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  assignedManagerId?: string;
}
