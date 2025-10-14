import { IsString, IsOptional, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CompanyUserStatus } from '@prisma/client';

export class CreateCompanyUserDto {
  @ApiProperty({ description: 'User ID (from User model)' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsUUID()
  companyId: string;

  @ApiProperty({ description: 'Role ID (optional)', required: false })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty({ description: 'First name', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: 'Middle name', required: false })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ description: 'Last name', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ 
    description: 'Status', 
    enum: CompanyUserStatus, 
    default: CompanyUserStatus.PENDING,
    required: false 
  })
  @IsOptional()
  @IsEnum(CompanyUserStatus)
  status?: CompanyUserStatus;

  @ApiProperty({ description: 'Is active', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}