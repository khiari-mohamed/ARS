import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreateConnectorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  type: string; // 'rest', 'ftp', 'email', 'webhook'

  @IsOptional()
  @IsObject()
  config?: any;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}