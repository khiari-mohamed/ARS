import { IsOptional, IsString, IsInt, IsObject, IsArray, IsEmail, IsIn } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  compagnieAssurance?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';

  @IsOptional()
  @IsInt()
  reglementDelay?: number;

  @IsOptional()
  @IsInt()
  reclamationDelay?: number;

  @IsOptional()
  @IsString()
  teamLeaderId?: string;

  @IsOptional()
  @IsObject()
  slaConfig?: any;
}
