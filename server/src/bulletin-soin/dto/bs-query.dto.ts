export class BsQueryDto {
  page?: number;
  limit?: number;
  etat?: string;
  ownerId?: number;
  bordereauId?: number;
  search?: string;
  prestataire?: string;
  dateStart?: string;
  dateEnd?: string;
}
