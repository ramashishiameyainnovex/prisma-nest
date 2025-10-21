import { IsString, IsDate, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  IN_REVIEW = 'IN_REVIEW',
}

export class CreateLeafDto {
  @IsString()
  userId: string;

  @IsString()
  companyId: string;

  @IsString()
  leaveTypeId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsOptional()
  @IsString()
  usersLeaveRecordId?: string;

  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;
}

export class CreateLeafWithFileDto extends CreateLeafDto {
  @IsOptional()
  file?: any;
}

export class CreateCommentDto {
  @IsString()
  userId: string;

  @IsString()
  leaveId: string;

  @IsString()
  comment: string;
}

export class CreateAttachmentDto {
  @IsString()
  userId: string;

  @IsString()
  leaveId: string;

  @IsString()
  attachment: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;
}