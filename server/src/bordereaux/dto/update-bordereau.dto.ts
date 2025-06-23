import { PartialType } from '@nestjs/mapped-types';
import { CreateBordereauDto } from './create-bordereau.dto';

export class UpdateBordereauDto extends PartialType(CreateBordereauDto) {}