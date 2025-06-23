import { IsOptional, IsString } from 'class-validator';

export class ConfirmVirementDto {
  @IsOptional()
  @IsString()
  confirmationNote?: string;
}
