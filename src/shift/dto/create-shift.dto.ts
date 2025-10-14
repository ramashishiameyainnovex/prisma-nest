import { IsString, IsOptional, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ShiftAttributeDto {
  @ApiProperty({ description: 'Shift name' })
  @IsString()
  shiftName: string;

  @ApiProperty({ description: 'Start time', example: '2024-01-15T09:00:00.000Z' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time', example: '2024-01-15T17:00:00.000Z' })
  @IsString()
  endTime: string;

  @ApiProperty({ description: 'Break duration in minutes', required: false })
  @IsOptional()
  @IsString()
  breakDuration?: string;

  @ApiProperty({ description: 'Grace period in minutes', required: false })
  @IsOptional()
  @IsString()
  gracePeriodMinutes?: string;

  @ApiProperty({ description: 'Shift description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Color for UI', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Assigned user IDs', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignedUserIds?: string[];
}

export class CreateShiftDto {
  @ApiProperty({ description: 'Company ID' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ description: 'User ID who creates the shift' })
  @IsUUID()
  shiftCreatedBy: string;

  @ApiProperty({ description: 'Shift attributes', type: [ShiftAttributeDto] })
  @ValidateNested({ each: true })
  @Type(() => ShiftAttributeDto)
  shiftAttributes: ShiftAttributeDto[];
}