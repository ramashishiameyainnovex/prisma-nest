import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  ParseArrayPipe,
} from '@nestjs/common';
import { LeaveTypeAllocationService } from './leave-type-allocation.service';
import { CreateLeaveTypeAllocationDto } from './dto/create-leave-type-allocation.dto';
import { QueryLeaveTypeAllocationDto } from './dto/query-leave-type-allocation.dto';
import { QueryUsersLeaveRecordDto } from './dto/query-users-leave-record.dto';
import { CreateCarryForwardDaysDto } from './dto/create-carry-forward-days.dto';
import { UpdateLeaveTypeAllocationDto } from './dto/update-leave-type-allocation.dto';

@Controller('leave-type-allocations')
export class LeaveTypeAllocationController {
  constructor(private readonly leaveTypeAllocationService: LeaveTypeAllocationService) {}

  @Post()
  async create(@Body() createLeaveTypeAllocationDto: CreateLeaveTypeAllocationDto) {
    const result = await this.leaveTypeAllocationService.create(createLeaveTypeAllocationDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: result.message,
      data: result,
    };
  }

  @Get()
  async findAll(@Query() query: QueryLeaveTypeAllocationDto) {
    const allocations = await this.leaveTypeAllocationService.findAll(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'Leave type allocations retrieved successfully',
      data: allocations,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const allocation = await this.leaveTypeAllocationService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Leave type allocation retrieved successfully',
      data: allocation,
    };
  }

  @Get('company/:companyId')
  async findByCompanyId(@Param('companyId') companyId: string) {
    const allocation = await this.leaveTypeAllocationService.findByCompanyId(companyId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Leave type allocation retrieved successfully',
      data: allocation,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLeaveTypeAllocationDto: UpdateLeaveTypeAllocationDto,
  ) {
    const allocation = await this.leaveTypeAllocationService.update(id, updateLeaveTypeAllocationDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Leave type allocation updated successfully',
      data: allocation,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const result = await this.leaveTypeAllocationService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  @Delete('attributes/remove')
  async removeAttributes(
    @Body('attributeIds', new ParseArrayPipe({ items: String })) attributeIds: string[],
  ) {
    const result = await this.leaveTypeAllocationService.removeAttributes(attributeIds);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }

  // UsersLeaveRecord 
  @Get('users-leave-records/all')
  async findAllUsersLeaveRecords(@Query() query: QueryUsersLeaveRecordDto) {
    const records = await this.leaveTypeAllocationService.findAllUsersLeaveRecords(query);
    return {
      statusCode: HttpStatus.OK,
      message: 'User leave records retrieved successfully',
      data: records,
    };
  }
// Get single user leave record by record ID
@Get('users-leave-records/:id')
async findUsersLeaveRecord(@Param('id') id: string) {
  const record = await this.leaveTypeAllocationService.findUsersLeaveRecord(id);
  return {
    statusCode: HttpStatus.OK,
    message: 'User leave record retrieved successfully',
    data: record,
  };
}
// Get all leave records for a user by userId
@Get('users/:userId/leave-records')
async findUserLeaveRecords(@Param('userId') userId: string) {
  const result = await this.leaveTypeAllocationService.findUserLeaveRecords(userId);
  return {
    statusCode: HttpStatus.OK,
    message: 'User leave records retrieved successfully',
    data: result,
  };
}

// Get all leave records for a user by companyUserId
@Get('company-users/:companyUserId/leave-records')
async findUserLeaveRecordsByCompanyUser(@Param('companyUserId') companyUserId: string) {
  const result = await this.leaveTypeAllocationService.findUserLeaveRecordsByCompanyUser(companyUserId);
  return {
    statusCode: HttpStatus.OK,
    message: 'User leave records retrieved successfully',
    data: result,
  };
}
  @Patch('users-leave-records/:id/used-days')
  async updateUsersLeaveRecordUsedDays(
    @Param('id') id: string,
    @Body('usedDays') usedDays: number,
  ) {
    const record = await this.leaveTypeAllocationService.updateUsersLeaveRecordUsedDays(id, usedDays);
    return {
      statusCode: HttpStatus.OK,
      message: 'User leave record updated successfully',
      data: record,
    };
  }

  // CarryForwardDays
  @Post('carry-forward-days')
  async createCarryForwardDays(@Body() createCarryForwardDaysDto: CreateCarryForwardDaysDto) {
    const carryForward = await this.leaveTypeAllocationService.createCarryForwardDays(createCarryForwardDaysDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Carry forward days created successfully',
      data: carryForward,
    };
  }

  @Get('carry-forward-days/user-record/:usersLeaveRecordId')
  async findCarryForwardDaysByUserRecord(@Param('usersLeaveRecordId') usersLeaveRecordId: string) {
    const carryForwards = await this.leaveTypeAllocationService.findCarryForwardDaysByUserRecord(usersLeaveRecordId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Carry forward days retrieved successfully',
      data: carryForwards,
    };
  }

  @Delete('carry-forward-days/:id')
  async removeCarryForwardDays(@Param('id') id: string) {
    const result = await this.leaveTypeAllocationService.removeCarryForwardDays(id);
    return {
      statusCode: HttpStatus.OK,
      message: result.message,
    };
  }
}