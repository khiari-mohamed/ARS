import { IsOptional, IsString, IsObject, IsIn } from 'class-validator';

export class SearchClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'suspended', 'all'])
  status?: string;

  @IsOptional()
  @IsString()
  gestionnaireId?: string;

  @IsOptional()
  @IsObject()
  slaConfig?: any;
}
