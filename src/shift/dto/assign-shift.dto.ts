import { IsUUID, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignShiftDto {
  @ApiProperty({ description: 'Shift attribute ID' })
  @IsUUID()
  shiftAttributeId: string;

  @ApiProperty({ description: 'User IDs to assign', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  assignedUserIds: string[];

  @ApiProperty({ description: 'User IDs to remove', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  removeUserIds?: string[];
}