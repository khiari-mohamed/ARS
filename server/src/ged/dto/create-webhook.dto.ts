import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsArray, IsUrl } from 'class-validator';

export class CreateWebhookDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsOptional()
  @IsArray()
  events?: string[] = [];

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}