import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional() signature?: string; // <-- NEW

  @IsOptional()
  @IsInt()
  delaiReglement?: number;

  @IsOptional()
  @IsInt()
  delaiReclamation?: number;

  @IsOptional()
  @IsInt()
  escalationThreshold?: number;

  @IsOptional()
  @IsString()
  documentPath?: string;

  @IsOptional()
  @IsString()
  assignedManagerId?: string;
}
