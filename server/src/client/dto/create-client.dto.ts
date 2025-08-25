import { IsNotEmpty, IsString, IsInt, IsOptional, IsObject, IsArray, IsEmail, IsIn } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  name: string;

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
  @IsArray()
  @IsString({ each: true })
  gestionnaireIds?: string[];

  @IsOptional()
  @IsObject()
  slaConfig?: any;
}
