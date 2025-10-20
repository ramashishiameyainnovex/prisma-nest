import { PartialType } from '@nestjs/mapped-types';
import { CreateLeaveTypeAllocationDto, LeaveAttributeDto } from './create-leave-type-allocation.dto';
import { IsArray, ValidateNested, IsOptional, IsDate, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLeaveAttributeDto extends PartialType(LeaveAttributeDto) {
  @IsOptional()
  @IsNumber()
  @Min(2020)
  year?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allocatedDays?: number;
}

export class UpdateLeaveTypeAllocationDto extends PartialType(CreateLeaveTypeAllocationDto) {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateLeaveAttributeDto)
  leaveAttributes?: LeaveAttributeDto[];
}