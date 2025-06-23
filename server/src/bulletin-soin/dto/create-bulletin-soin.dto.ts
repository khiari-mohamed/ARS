import { BulletinSoinItem } from '../entities/bulletin-soin.entity';
import { IsString, IsDate, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBulletinSoinDto {
  @IsString()
  numBs: string;

  @IsString()
  codeAssure: string;

  @IsString()
  nomAssure: string;

  @IsDate()
  @Type(() => Date)
  dateMaladie: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulletinSoinItem)
  items: BulletinSoinItem[];

  nomBeneficiaire: string;
  nomSociete: string;
  nomPrestation: string;
  nomBordereau: string;
  lien: string;
  dateCreation: Date;
  totalPec: number;
  observationGlobal: string;
  etat: string;
  ownerId?: number;
}
