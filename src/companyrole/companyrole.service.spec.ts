import { Test, TestingModule } from '@nestjs/testing';
import { CompanyroleService } from './companyrole.service';

describe('CompanyroleService', () => {
  let service: CompanyroleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanyroleService],
    }).compile();

    service = module.get<CompanyroleService>(CompanyroleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
