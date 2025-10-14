import { PartialType } from '@nestjs/swagger';
import { CreateShiftDto, ShiftAttributeDto } from './create-shift.dto';

export class UpdateShiftAttributeDto extends PartialType(ShiftAttributeDto) {}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {}