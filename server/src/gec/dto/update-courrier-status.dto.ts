import { IsNotEmpty, IsEnum } from 'class-validator';
import { CourrierStatus } from './search-courrier.dto';

export class UpdateCourrierStatusDto {
  @IsNotEmpty()
  @IsEnum(CourrierStatus)
  status: CourrierStatus;
}
