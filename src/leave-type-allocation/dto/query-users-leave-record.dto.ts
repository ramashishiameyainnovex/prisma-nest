import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryUsersLeaveRecordDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  companyUserId?: string;

  @IsOptional()
  @IsString()
  leaveAttributeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2020)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  usedDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remainingDays?: number;
}