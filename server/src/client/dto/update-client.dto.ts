import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  reglementDelay?: number;

  @IsOptional()
  @IsInt()
  reclamationDelay?: number;

  @IsOptional()
  @IsString()
  accountManagerId?: string;
}
