import { IsNotEmpty, IsString, IsInt, IsOptional, IsObject, IsArray, IsEmail, IsIn } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  compagnieAssurance: string;

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

  @IsNotEmpty()
  @IsInt()
  reglementDelay: number;

  @IsNotEmpty()
  @IsInt()
  reclamationDelay: number;

  @IsOptional()
  @IsString()
  teamLeaderId?: string;

  @IsOptional()
  @IsObject()
  slaConfig?: any;
}
