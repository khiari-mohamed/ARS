import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class UpdateTraitementStatusDto {
  @IsNotEmpty()
  @IsString()
  bordereauId: string;

  @IsNotEmpty()
  @IsIn(['EN_ATTENTE', 'SCAN_EN_COURS', 'SCAN_TERMINE', 'ASSIGNE', 'TRAITE', 'CLOTURE', 'EN_DIFFICULTE', 'RETOURNE'])
  statut: string;
}
