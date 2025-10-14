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
  HttpCode,
  Query 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CompanyUserService } from './company-user.service';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { CompanyUserStatus } from '@prisma/client';

@ApiTags('company-users')
@Controller('company-users')
export class CompanyUserController {
  constructor(private readonly companyUserService: CompanyUserService) {}

  @Post()
  @ApiOperation({ summary: 'Add user to company' })
  @ApiResponse({ status: 201, description: 'User added to company successfully' })
  @ApiResponse({ status: 404, description: 'Company or User not found' })
  @ApiResponse({ status: 409, description: 'User already exists in company' })
  async create(@Body() createCompanyUserDto: CreateCompanyUserDto) {
    return await this.companyUserService.create(createCompanyUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all company users' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filter by company ID' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiResponse({ status: 200, description: 'Company users retrieved successfully' })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
  ) {
    if (companyId) {
      return await this.companyUserService.findByCompany(companyId);
    }
    if (userId) {
      return await this.companyUserService.findByUser(userId);
    }
    return await this.companyUserService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company user by ID' })
  @ApiParam({ name: 'id', description: 'Company User ID' })
  @ApiResponse({ status: 200, description: 'Company user retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company user not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.companyUserService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company user' })
  @ApiParam({ name: 'id', description: 'Company User ID' })
  @ApiResponse({ status: 200, description: 'Company user updated successfully' })
  @ApiResponse({ status: 404, description: 'Company user not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyUserDto: UpdateCompanyUserDto,
  ) {
    return await this.companyUserService.update(id, updateCompanyUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove user from company' })
  @ApiParam({ name: 'id', description: 'Company User ID' })
  @ApiResponse({ status: 204, description: 'User removed from company successfully' })
  @ApiResponse({ status: 404, description: 'Company user not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.companyUserService.remove(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update company user status' })
  @ApiParam({ name: 'id', description: 'Company User ID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Company user not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: CompanyUserStatus,
  ) {
    return await this.companyUserService.updateStatus(id, status);
  }

  @Patch(':id/assign-role')
  @ApiOperation({ summary: 'Assign role to company user' })
  @ApiParam({ name: 'id', description: 'Company User ID' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  @ApiResponse({ status: 404, description: 'Company user or Role not found' })
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('roleId') roleId: string,
  ) {
    return await this.companyUserService.assignRole(id, roleId);
  }

  @Patch(':id/remove-role')
  @ApiOperation({ summary: 'Remove role from company user' })
  @ApiParam({ name: 'id', description: 'Company User ID' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 404, description: 'Company user not found' })
  async removeRole(@Param('id', ParseUUIDPipe) id: string) {
    return await this.companyUserService.removeRole(id);
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Get all users for a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company users retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findByCompany(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return await this.companyUserService.findByCompany(companyId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all companies for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User companies retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return await this.companyUserService.findByUser(userId);
  }
}