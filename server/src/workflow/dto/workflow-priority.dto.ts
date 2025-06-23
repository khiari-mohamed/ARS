import { ApiProperty } from '@nestjs/swagger';

export class WorkflowPriorityDto {
  @ApiProperty()
  taskId: string;

  @ApiProperty()
  priority: number;

  @ApiProperty({ required: false })
  assigneeId?: string;

  @ApiProperty({ required: false })
  teamId?: string;
}