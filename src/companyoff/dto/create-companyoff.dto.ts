import { IsString, IsArray, IsOptional, IsInt, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateCompanyoffDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekDay: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday

  @IsString()
  @IsOptional()
  description?: string;
}