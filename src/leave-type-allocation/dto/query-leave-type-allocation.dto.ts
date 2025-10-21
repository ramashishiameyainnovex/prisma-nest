import { IsOptional, IsString, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryLeaveTypeAllocationDto {
  @IsOptional()
  @IsString()
  leaveName?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  allocatedDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2020)
  year?: number;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}