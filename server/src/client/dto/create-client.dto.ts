import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsInt()
  reglementDelay: number;

  @IsNotEmpty()
  @IsInt()
  reclamationDelay: number;

  @IsNotEmpty()
  @IsString()
  accountManagerId: string;
}
