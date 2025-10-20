import { Test, TestingModule } from '@nestjs/testing';
import { LeaveTypeAllocationController } from './leave-type-allocation.controller';
import { LeaveTypeAllocationService } from './leave-type-allocation.service';

describe('LeaveTypeAllocationController', () => {
  let controller: LeaveTypeAllocationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveTypeAllocationController],
      providers: [LeaveTypeAllocationService],
    }).compile();

    controller = module.get<LeaveTypeAllocationController>(LeaveTypeAllocationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
