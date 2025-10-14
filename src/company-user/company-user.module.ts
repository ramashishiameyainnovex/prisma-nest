import { Module } from '@nestjs/common';
import { CompanyUserService } from './company-user.service';
import { CompanyUserController } from './company-user.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyUserController],
  providers: [CompanyUserService],
  exports: [CompanyUserService],
})
export class CompanyUserModule {}