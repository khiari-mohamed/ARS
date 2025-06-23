import { IsString, IsDateString, IsOptional, IsInt, IsUUID, IsEnum } from 'class-validator';
import { Statut } from './statut.enum';

export class CreateBordereauDto {
  @IsString()
  reference: string;

  @IsDateString()
  dateReception: string;

  @IsUUID()
  clientId: string;

  @IsUUID()
  contractId: string;

  @IsOptional()
  @IsDateString()
  dateDebutScan?: string;

  @IsOptional()
  @IsDateString()
  dateFinScan?: string;

  @IsOptional()
  @IsDateString()
  dateReceptionSante?: string;

  @IsOptional()
  @IsDateString()
  dateCloture?: string;

  @IsOptional()
  @IsDateString()
  dateDepotVirement?: string;

  @IsOptional()
  @IsDateString()
  dateExecutionVirement?: string;

  @IsInt()
  delaiReglement: number;

  @IsOptional()
  @IsEnum(Statut)
  statut?: Statut;

  @IsInt()
  nombreBS: number;
}