import { IsOptional, IsUUID, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FilterShiftDto {
  @ApiProperty({ description: 'Company ID', required: false })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({ description: 'Created by user ID', required: false })
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiProperty({ description: 'Assigned user ID', required: false })
  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @ApiProperty({ description: 'Shift name', required: false })
  @IsOptional()
  @IsString()
  shiftName?: string;

  @ApiProperty({ description: 'Start date from', required: false })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiProperty({ description: 'Start date to', required: false })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  isActive?: boolean;
}