import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyoffDto } from './create-companyoff.dto';

export class UpdateCompanyoffDto extends PartialType(CreateCompanyoffDto) {}