import { PartialType } from '@nestjs/mapped-types';
import { CreateOffdayDto } from './create-offday.dto';

export class UpdateOffdayDto extends PartialType(CreateOffdayDto) {}