import { IsString, IsArray, ValidateNested, IsNotEmpty, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class LeaveAttributeDto {
  @IsNumber()
  @Min(2025)
  year: number;

  @IsString()
  @IsNotEmpty()
  leaveName: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsNumber()
  @Min(0)
  allocatedDays: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateLeaveTypeAllocationDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  createdById: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaveAttributeDto)
  leaveAttributes: LeaveAttributeDto[];
}