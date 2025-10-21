import { IsString, IsArray, ValidateNested, IsNotEmpty, IsNumber, Min, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class LeaveAttributeDto {
  @IsString()
  @IsNotEmpty()
  id: string;
  
  @IsString()
  @IsNotEmpty()
  leaveTypeAllocationId: string;

  @IsNumber()
  @Min(2020)
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

  @IsDateString()
  @IsOptional()
  createdAt?: string;
  @IsDateString()
  @IsOptional()
  updatedAt?: string;
}

export class UpdateLeaveTypeAllocationDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsNotEmpty()
  createdById: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaveAttributeDto)
  leaveAttributes?: LeaveAttributeDto[]; 
}