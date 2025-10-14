import { 
  Controller, 
  Post, 
  Body,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CompanyRoleService } from './companyrole.service';
import { CreateCompanyRoleDto } from './dto/create-companyrole.dto';

@ApiTags('company-roles')
@Controller('company-roles')
export class CompanyRoleController {
  constructor(private readonly companyRoleService: CompanyRoleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new company role' })
  @ApiBody({ type: CreateCompanyRoleDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Company role successfully created' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad request - missing required fields' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Company not found' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Role with this name already exists in this company' 
  })
  async create(@Body() createCompanyRoleDto: CreateCompanyRoleDto) {
    console.log('Received request body:', createCompanyRoleDto);
    return await this.companyRoleService.create(createCompanyRoleDto);
  }
}