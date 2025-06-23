import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendCourrierDto {
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
