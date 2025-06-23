import { IsOptional, IsString, IsInt } from 'class-validator';

export class SearchTraitementDto {
  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

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
