import { PartialType } from '@nestjs/mapped-types';
import { CreateBulletinSoinDto } from './create-bulletin-soin.dto';

export class UpdateBulletinSoinDto extends PartialType(CreateBulletinSoinDto) {
  etat?: string;
  ownerId?: number;
  observationGlobal?: string;
}
