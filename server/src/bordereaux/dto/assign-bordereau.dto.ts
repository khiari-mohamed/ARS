import { IsString, IsUUID, IsOptional } from 'class-validator';

export class AssignBordereauDto {
  @IsUUID()
  bordereauId: string;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}