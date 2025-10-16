import { Test, TestingModule } from '@nestjs/testing';
import { CompanyoffController } from './companyoff.controller';
import { CompanyoffService } from './companyoff.service';

describe('CompanyoffController', () => {
  let controller: CompanyoffController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyoffController],
      providers: [CompanyoffService],
    }).compile();

    controller = module.get<CompanyoffController>(CompanyoffController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
