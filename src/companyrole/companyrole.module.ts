import { Module } from '@nestjs/common';
import { CompanyRoleService } from './companyrole.service';
import { CompanyRoleController } from './companyrole.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyRoleController],
  providers: [CompanyRoleService],
  exports: [CompanyRoleService],
})
export class CompanyRoleModule {}