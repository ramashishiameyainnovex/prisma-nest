import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query, 
  HttpCode, 
  HttpStatus,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { LeaveTypeAllocationService } from './leave-type-allocation.service';
import { CreateLeaveTypeAllocationDto } from './dto/create-leave-type-allocation.dto';
import { UpdateLeaveTypeAllocationDto } from './dto/update-leave-type-allocation.dto';
import { QueryLeaveTypeAllocationDto } from './dto/query-leave-type-allocation.dto';

@Controller('leave-type-allocation')
export class LeaveTypeAllocationController {
  constructor(private readonly leaveTypeAllocationService: LeaveTypeAllocationService) {}

  @Post()
  async create(@Body() createLeaveTypeAllocationDto: CreateLeaveTypeAllocationDto) {
    return await this.leaveTypeAllocationService.create(createLeaveTypeAllocationDto);
  }

  @Get()
  async findAll(@Query() query: QueryLeaveTypeAllocationDto) {
    return await this.leaveTypeAllocationService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.leaveTypeAllocationService.findOne(id);
  }

  @Patch('/:id')
  async update(
    @Param('id') id: string, 
    @Body() updateLeaveTypeAllocationDto: UpdateLeaveTypeAllocationDto
  ) {
    return await this.leaveTypeAllocationService.update(id, updateLeaveTypeAllocationDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return await this.leaveTypeAllocationService.remove(id);
  }
}