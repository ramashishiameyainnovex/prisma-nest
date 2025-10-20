import { Module } from '@nestjs/common';
import { LeaveTypeAllocationService } from './leave-type-allocation.service';
import { LeaveTypeAllocationController } from './leave-type-allocation.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveTypeAllocationController],
  providers: [LeaveTypeAllocationService],
})
export class LeaveTypeAllocationModule {}