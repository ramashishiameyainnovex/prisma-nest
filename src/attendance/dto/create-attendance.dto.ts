import { IsString, IsOptional, IsEnum, IsObject, IsDate, IsNumber } from 'class-validator';

export class LocationDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  latitude?: string;

  @IsOptional()
  @IsString()
  longitude?: string;
}

export class CreateAttendanceDto {
  @IsString()
  companyId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  companyUserId: string;

  @IsOptional()
  @IsDate()
  punchIn?: Date;

  @IsOptional()
  @IsDate()
  punchOut?: Date;

  @IsOptional()
  @IsObject()
  punchInLocation?: LocationDto;

  @IsOptional()
  @IsObject()
  punchOutLocation?: LocationDto;

  @IsOptional()
  @IsEnum(['PRESENT', 'ABSENT', 'ON_LEAVE', 'HALF_DAY', 'LATE', 'EARLY_LEAVE'])
  status?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateAttendanceDto {
  @IsOptional()
  @IsEnum(['PRESENT', 'ABSENT', 'ON_LEAVE', 'HALF_DAY', 'LATE', 'EARLY_LEAVE'])
  status?: string;

  @IsOptional()
  @IsNumber()
  workHours?: number;

  @IsOptional()
  @IsNumber()
  overtime?: number;
}

export class AttendanceFilterDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class UserAttendanceFilterDto {
  @IsString()
  companyId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsDate()
  date?: Date;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;
}

export class AttendanceSummaryDto {
  @IsString()
  userId: string;

  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  month?: string;
}