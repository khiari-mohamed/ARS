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
    society: string;
    rib: string;
    amount: number;
    status: string;
    notes: string;
    memberId?: string;
  }[];

  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;
}