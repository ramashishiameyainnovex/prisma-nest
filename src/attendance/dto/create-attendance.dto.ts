import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus, PunchType } from '@prisma/client';

export class CreateAttendanceDto {
  @ApiProperty({ description: 'Company ID' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Company User ID', required: false })
  @IsOptional()
  @IsUUID()
  companyUserId?: string;

  @ApiProperty({ description: 'User Punch ID (for punch out)', required: false })
  @IsOptional()
  @IsUUID()
  userPunchId?: string;

  @ApiProperty({ description: 'Attendance ID (for punch out)', required: false })
  @IsOptional()
  @IsUUID()
  attendanceId?: string;

  @ApiProperty({ description: 'Punch date', example: '2024-01-15' })
  @IsDateString()
  punchDate: string;

  @ApiProperty({ description: 'Punch in time', required: false, example: '2024-01-15T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  punchIn?: string;

  @ApiProperty({ description: 'Punch out time', required: false, example: '2024-01-15T17:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  punchOut?: string;

  @ApiProperty({ description: 'Punch in location', required: false })
  @IsOptional()
  @IsString()
  punchInLocation?: string;

  @ApiProperty({ description: 'Punch out location', required: false })
  @IsOptional()
  @IsString()
  punchOutLocation?: string;

  @ApiProperty({ enum: PunchType, required: true })
  @IsEnum(PunchType)
  punchType: PunchType;

  @ApiProperty({ description: 'Device ID', required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ description: 'IP address', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'Remarks', required: false })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ description: 'Work hours', required: false })
  @IsOptional()
  @IsNumber()
  workHours?: number;

  @ApiProperty({ description: 'Overtime hours', required: false })
  @IsOptional()
  @IsNumber()
  overtime?: number;
}