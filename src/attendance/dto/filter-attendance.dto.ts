import { IsOptional, IsUUID, IsDateString, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class FilterAttendanceDto {
  @ApiProperty({ description: 'Company ID', required: false })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty({ description: 'User ID', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Company User ID', required: false })
  @IsOptional()
  @IsUUID()
  companyUserId?: string;

  @ApiProperty({ description: 'Start date', required: false, example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date', required: false, example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ enum: AttendanceStatus, required: false })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  finalStatus?: AttendanceStatus;

  @ApiProperty({ description: 'Search by user name', required: false })
  @IsOptional()
  @IsString()
  userName?: string;
}