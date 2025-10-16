import { Test, TestingModule } from '@nestjs/testing';
import { CompanyoffService } from './companyoff.service';

describe('CompanyoffService', () => {
  let service: CompanyoffService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanyoffService],
    }).compile();

    service = module.get<CompanyoffService>(CompanyoffService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
