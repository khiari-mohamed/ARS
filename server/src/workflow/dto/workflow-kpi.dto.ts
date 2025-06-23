import { ApiProperty } from '@nestjs/swagger';

export class WorkflowKpiDto {
  @ApiProperty()
  teamId: string;

  @ApiProperty()
  dateFrom?: Date;

  @ApiProperty()
  dateTo?: Date;
}