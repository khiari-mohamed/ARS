import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateReclamationDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'ESCALATED', 'PENDING_CLIENT_REPLY', 'RESOLVED', 'CLOSED'])
  status?: string;

  @IsOptional()
  @IsString()
  description?: string;
  
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
  @IsString()
  assignedToId?: string;
}
