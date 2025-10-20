import { IsString, IsArray, ValidateNested, IsNotEmpty, IsNumber, Min, IsDate, IsOptional } from 'class-validator';
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
  @IsNotEmpty()
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