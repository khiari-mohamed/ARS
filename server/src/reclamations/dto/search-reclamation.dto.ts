import { IsOptional, IsString, IsInt } from 'class-validator';

export class SearchReclamationDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
  
  @IsOptional()
  @IsString()
  department?: string;
  
  @IsOptional()
  @IsString()
  contractId?: string;
  
  @IsOptional()
  @IsString()
  processId?: string;

  @IsOptional()
  @IsInt()
  take?: number;

  @IsOptional()
  @IsInt()
  skip?: number;

  @IsOptional()
  @IsString()
  orderBy?: string;
}
