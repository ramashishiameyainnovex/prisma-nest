import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ArticlesModule } from './articles/articles.module';
import { CompanyModule } from './company/company.module';
import { CompanyUserModule } from './company-user/company-user.module';
import { UserModule } from './user/user.module';
import { CompanyRoleModule } from './companyrole/companyrole.module';
import { ShiftModule } from './shift/shift.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [PrismaModule, ArticlesModule, CompanyModule, CompanyUserModule, UserModule, CompanyRoleModule, ShiftModule, AttendanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
