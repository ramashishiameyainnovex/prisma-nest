import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  ParseUUIDPipe,
  HttpStatus 
} from '@nestjs/common';
import { CompanyoffService } from './companyoff.service';
import { CreateCompanyoffDto } from './dto/create-companyoff.dto';
import { UpdateCompanyoffDto } from './dto/update-companyoff.dto';
import { CreateOffdayDto } from './dto/create-offday.dto';
import { UpdateOffdayDto } from './dto/update-offday.dto';

@Controller('companyoff')
export class CompanyoffController {
  constructor(private readonly companyoffService: CompanyoffService) {}

  // CompanyOff endpoints
  @Post()
  create(@Body() createCompanyoffDto: CreateCompanyoffDto) {
    return this.companyoffService.create(createCompanyoffDto);
  }

  @Get()
  findAll(
    @Query('companyId') companyId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.companyoffService.findAll(companyId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companyoffService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string, 
    @Body() updateCompanyoffDto: UpdateCompanyoffDto
  ) {
    return this.companyoffService.update(id, updateCompanyoffDto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companyoffService.remove(id);
  }

  // OffDay endpoints
  @Post('offday')
  createOffDay(@Body() createOffdayDto: CreateOffdayDto) {
    return this.companyoffService.createOffDay(createOffdayDto);
  }

  @Get('offday/company/:companyId')
  findOffDaysByCompany(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    return this.companyoffService.findOffDaysByCompany(companyId, fromDate, toDate);
  }

  @Get('offday/user/:userId')
  findOffDaysByUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    return this.companyoffService.findOffDaysByUser(userId, fromDate, toDate);
  }

  @Get('offday/:id')
  findOffDayById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companyoffService.findOffDayById(id);
  }

  @Patch('offday/:id')
  updateOffDay(
    @Param('id', new ParseUUIDPipe()) id: string, 
    @Body() updateOffdayDto: UpdateOffdayDto
  ) {
    return this.companyoffService.updateOffDay(id, updateOffdayDto);
  }

  @Delete('offday/:id')
  removeOffDay(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.companyoffService.removeOffDay(id);
  }

  // Utility endpoints
  @Get('company/:companyId/week-off')
  getCompanyWeekOff(@Param('companyId', new ParseUUIDPipe()) companyId: string) {
    return this.companyoffService.getCompanyWeekOff(companyId);
  }

  @Get('user/:userId/upcoming-off')
  getUpcomingOffDaysForUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('days') days: number = 30
  ) {
    return this.companyoffService.getUpcomingOffDaysForUser(userId, days);
  }
}