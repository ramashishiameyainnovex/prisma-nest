import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateCarryForwardDaysDto {
  @IsString()
  @IsNotEmpty()
  usersLeaveRecordId: string;

  @IsNumber()
  @Min(0)
  days: number;

  @IsNumber()
  @Min(2025)
  year: number;
}