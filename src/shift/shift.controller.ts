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
import { ShiftService } from './shift.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';
import { FilterShiftDto } from './dto/filter-shift.dto';

@ApiTags('shifts')
@Controller('shifts')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new shift' })
  @ApiResponse({ status: 201, description: 'Shift created successfully' })
  @ApiResponse({ status: 404, description: 'Company or user not found' })
  async create(@Body() createShiftDto: CreateShiftDto) {
    return await this.shiftService.create(createShiftDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shifts with filters' })
  @ApiResponse({ status: 200, description: 'Shifts retrieved successfully' })
  async findAll(@Query() filterShiftDto: FilterShiftDto) {
    return await this.shiftService.findAll(filterShiftDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shift by ID' })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  @ApiResponse({ status: 200, description: 'Shift retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.shiftService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shift' })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  @ApiResponse({ status: 200, description: 'Shift updated successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShiftDto: UpdateShiftDto,
  ) {
    return await this.shiftService.update(id, updateShiftDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shift' })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  @ApiResponse({ status: 204, description: 'Shift deleted successfully' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return await this.shiftService.remove(id);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign users to shift attribute' })
  @ApiResponse({ status: 200, description: 'Shift assigned successfully' })
  @ApiResponse({ status: 404, description: 'Shift attribute not found' })
  async assignShift(@Body() assignShiftDto: AssignShiftDto) {
    return await this.shiftService.assignShift(assignShiftDto);
  }

  @Patch('attribute/:id')
  @ApiOperation({ summary: 'Update a shift attribute' })
  @ApiParam({ name: 'id', description: 'Shift Attribute ID' })
  @ApiResponse({ status: 200, description: 'Shift attribute updated successfully' })
  @ApiResponse({ status: 404, description: 'Shift attribute not found' })
  async updateShiftAttribute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: any,
  ) {
    return await this.shiftService.updateShiftAttribute(id, updateData);
  }

  @Delete('attribute/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a shift attribute' })
  @ApiParam({ name: 'id', description: 'Shift Attribute ID' })
  @ApiResponse({ status: 204, description: 'Shift attribute deleted successfully' })
  @ApiResponse({ status: 404, description: 'Shift attribute not found' })
  async deleteShiftAttribute(@Param('id', ParseUUIDPipe) id: string) {
    return await this.shiftService.deleteShiftAttribute(id);
  }
}