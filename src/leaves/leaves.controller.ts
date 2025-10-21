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
  HttpCode,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeavesService } from './leaves.service';
import { CreateLeafDto, CreateLeafWithFileDto, CreateCommentDto } from './dto/create-leaf.dto';
import { UpdateLeafDto } from './dto/update-leaf.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/leaves',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `leave-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf|doc|docx)$/)) {
        return callback(new BadRequestException('Only image and document files are allowed'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  }))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createLeafDto: CreateLeafWithFileDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.leavesService.create(createLeafDto, file);
  }

  @Get()
  findAll(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.leavesService.findAll({ companyId, userId, status, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leavesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeafDto: UpdateLeafDto) {
    return this.leavesService.update(id, updateLeafDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.leavesService.remove(id);
  }

  @Post(':id/approve')
  async approveLeave(
    @Param('id') id: string,
    @Body('approverId') approverId: string
  ) {
    return this.leavesService.approveLeave(id, approverId);
  }

  @Post(':id/reject')
  async rejectLeave(
    @Param('id') id: string,
    @Body('approverId') approverId: string
  ) {
    return this.leavesService.rejectLeave(id, approverId);
  }

  @Post(':id/cancel')
  async cancelLeave(@Param('id') id: string) {
    return this.leavesService.cancelLeave(id);
  }

  @Post('comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(@Body() createCommentDto: CreateCommentDto) {
    return this.leavesService.addComment(createCommentDto);
  }

  @Get('user/:userId')
  async getUserLeaves(
    @Param('userId') userId: string,
    @Query('year') year?: number,
    @Query('companyId') companyId?: string
  ) {
    return this.leavesService.getUserLeaves(userId, companyId, year);
  }

  @Get('company/:companyId/stats')
  async getCompanyLeaveStats(@Param('companyId') companyId: string) {
    return this.leavesService.getCompanyLeaveStats(companyId);
  }

  @Get('user/:userId/balance')
  async getUserLeaveBalance(
    @Param('userId') userId: string,
    @Query('companyId') companyId: string,
    @Query('year') year?: number
  ) {
    return this.leavesService.getUserLeaveBalance(userId, companyId, year);
  }
}