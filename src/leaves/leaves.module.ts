import { Module } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
@Module({

  imports: [PrismaModule],
  controllers: [LeavesController],
  providers: [LeavesService, PrismaService],
  exports: [LeavesService],
})
export class LeavesModule { }
