import { IsUUID, IsDateString, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PunchType } from '@prisma/client';

export class PunchInOutDto {
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

  @ApiProperty({ description: 'Punch time', example: '2024-01-15T09:00:00.000Z' })
  @IsDateString()
  punchTime: string;

  @ApiProperty({ description: 'Location', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ enum: PunchType, default: PunchType.IN })
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
}