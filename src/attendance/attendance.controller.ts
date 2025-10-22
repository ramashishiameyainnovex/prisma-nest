import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  ParseUUIDPipe,
  BadRequestException
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { 
  CreateAttendanceDto, 
  UpdateAttendanceDto, 
  AttendanceFilterDto, 
  UserAttendanceFilterDto, 
  AttendanceSummaryDto 
} from './dto/create-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('punch-in')
  async punchIn(@Body() createAttendanceDto: CreateAttendanceDto) {
    try {
      return await this.attendanceService.PunchIn(createAttendanceDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('punch-out')
  async punchOut(@Body() createAttendanceDto: CreateAttendanceDto) {
    try {
      return await this.attendanceService.PunchOut(createAttendanceDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get()
  async findAll(@Query() filter: AttendanceFilterDto) {
    try {
      return await this.attendanceService.findAll(filter);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('user')
  async findUserAttendance(@Query() filter: UserAttendanceFilterDto) {
    try {
      return await this.attendanceService.findUserAttendance(filter);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('summary')
  async getUserAttendanceSummary(@Query() filter: AttendanceSummaryDto) {
    try {
      return await this.attendanceService.getUserAttendanceSummary(
        filter.userId, 
        filter.companyId, 
        filter.month
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.attendanceService.findOne(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto
  ) {
    try {
      return await this.attendanceService.update(id, updateAttendanceDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    try {
      return await this.attendanceService.remove(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}