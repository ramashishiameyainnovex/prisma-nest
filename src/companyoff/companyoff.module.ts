import { Module } from '@nestjs/common';
import { CompanyoffService } from './companyoff.service';
import { CompanyoffController } from './companyoff.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],

  controllers: [CompanyoffController],
  providers: [CompanyoffService],
    exports: [CompanyoffService],

})
export class CompanyoffModule {}
