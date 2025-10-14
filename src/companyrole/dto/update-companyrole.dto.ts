import { PartialType } from '@nestjs/swagger';
import { CreateCompanyRoleDto } from './create-companyrole.dto';

export class UpdateCompanyRoleDto extends PartialType(CreateCompanyRoleDto) {}