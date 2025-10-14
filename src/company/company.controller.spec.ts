import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  ParseUUIDPipe,
  HttpStatus,
  HttpCode 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company successfully created' })
  @ApiResponse({ status: 409, description: 'Company with this name already exists' })
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return await this.companyService.create(createCompanyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({ status: 200, description: 'Companies successfully retrieved' })
  async findAll() {
    return await this.companyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company successfully retrieved' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.companyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company successfully updated' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @ApiResponse({ status: 409, description: 'Company with this name already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return await this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 204, description: 'Company successfully deleted' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.companyService.remove(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get all users for a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company users successfully retrieved' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompanyUsers(@Param('id', ParseUUIDPipe) id: string) {
    return await this.companyService.getCompanyUsers(id);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Get all roles for a company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company roles successfully retrieved' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompanyRoles(@Param('id', ParseUUIDPipe) id: string) {
    return await this.companyService.getCompanyRoles(id);
  }
}