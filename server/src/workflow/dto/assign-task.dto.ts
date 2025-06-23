import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TASK_TYPES } from '../workflow.constants';

export class AssignTaskDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty({ enum: Object.values(TASK_TYPES) })
  @IsEnum(TASK_TYPES)
  taskType: string;

  @ApiProperty()
  @IsString()
  assigneeId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}