import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';

@ApiTags('attendances')
@Controller('attendances')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new attendance record or punch in/out' })
  @ApiResponse({ status: 201, description: 'Attendance created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: 'Company or user not found' })
  @ApiResponse({ status: 409, description: 'User is already punched in' })
  async create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return await this.attendanceService.create(createAttendanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all attendances with filters' })
  @ApiResponse({ status: 200, description: 'Attendances retrieved successfully' })
  async findAll(@Query() filterAttendanceDto: FilterAttendanceDto) {
    return await this.attendanceService.findAll(filterAttendanceDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an attendance by ID' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  @ApiResponse({ status: 200, description: 'Attendance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an attendance' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  @ApiResponse({ status: 200, description: 'Attendance updated successfully' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return await this.attendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an attendance' })
  @ApiParam({ name: 'id', description: 'Attendance ID' })
  @ApiResponse({ status: 204, description: 'Attendance deleted successfully' })
  @ApiResponse({ status: 404, description: 'Attendance not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.attendanceService.remove(id);
  }

  @Get('status/:userId/:companyId')
  @ApiOperation({ summary: 'Get user current punch status' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'User status retrieved successfully' })
  async getUserCurrentStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return await this.attendanceService.getUserCurrentStatus(userId, companyId);
  }

  @Get('summary/:userId/:companyId')
  @ApiOperation({ summary: 'Get user attendance summary' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)', required: true })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)', required: true })
  @ApiResponse({ status: 200, description: 'Attendance summary retrieved successfully' })
  async getAttendanceSummary(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.attendanceService.getUserAttendanceSummary(userId, companyId, startDate, endDate);
  }
}