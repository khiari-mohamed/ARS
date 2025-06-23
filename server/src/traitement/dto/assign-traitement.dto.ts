import { IsNotEmpty, IsString } from 'class-validator';

export class AssignTraitementDto {
  @IsNotEmpty()
  @IsString()
  bordereauId: string;

  @IsNotEmpty()
  @IsString()
  assignedToId: string;
}
