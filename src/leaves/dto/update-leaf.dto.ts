import { PartialType } from '@nestjs/swagger';
import { CreateLeafDto, LeaveStatus } from './create-leaf.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDate, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLeafDto extends PartialType(CreateLeafDto) {
  @ApiPropertyOptional({ enum: LeaveStatus })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @ApiPropertyOptional({ description: 'Approver ID' })
  @IsOptional()
  @IsString()
  approverId?: string;

  @ApiPropertyOptional({ description: 'Start date of leave' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date of leave' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}