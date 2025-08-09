import { IsNotEmpty, IsString, IsArray, IsNumber } from 'class-validator';

export class CreateOVDto {
  @IsNotEmpty()
  @IsString()
  donneurOrdreId: string;

  @IsNotEmpty()
  @IsString()
  societyId: string;

  @IsNotEmpty()
  @IsArray()
  adherents: {
    matricule: string;
    name: string;
    rib: string;
    amount: number;
  }[];

  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;
}