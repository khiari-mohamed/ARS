import { IsOptional, IsString } from 'class-validator';

export class SearchClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  accountManagerId?: string;
}
