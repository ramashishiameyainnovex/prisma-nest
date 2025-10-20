import { Test, TestingModule } from '@nestjs/testing';
import { LeaveTypeAllocationService } from './leave-type-allocation.service';

describe('LeaveTypeAllocationService', () => {
  let service: LeaveTypeAllocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeaveTypeAllocationService],
    }).compile();

    service = module.get<LeaveTypeAllocationService>(LeaveTypeAllocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
