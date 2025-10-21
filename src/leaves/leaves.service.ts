import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  Inject
} from '@nestjs/common';
import { PrismaClient, LeaveStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service'; // Update import path as needed
import { CreateLeafDto, CreateLeafWithFileDto, CreateCommentDto } from './dto/create-leaf.dto';
import { UpdateLeafDto } from './dto/update-leaf.dto';

interface FindAllOptions {
  companyId?: string;
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class LeavesService {
  constructor(
    private prisma: PrismaService 
  ) {}

  async create(createLeafDto: CreateLeafWithFileDto, file?: Express.Multer.File) {
    const {
      userId,
      companyId,
      leaveTypeId,
      startDate,
      endDate,
      reason,
      approverId,
      usersLeaveRecordId,
      status = LeaveStatus.PENDING
    } = createLeafDto;

    // 1. Validate dates
    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate leave days (excluding weekends, considering only working days)
    const leaveDays = this.calculateWorkingDays(startDate, endDate);
    
    if (leaveDays <= 0) {
      throw new BadRequestException('Leave duration must be at least 1 working day');
    }

    // 2. Check if leaveType exists and get user's role
    const leaveAttribute = await this.prisma.leaveAttribute.findFirst({
      where: {
        id: leaveTypeId,
        isActive: true,
        leaveTypeAllocation: {
          companyId: companyId
        }
      },
      include: {
        leaveTypeAllocation: true
      }
    });

    if (!leaveAttribute) {
      throw new NotFoundException('Leave type not found or inactive');
    }

    // Get user's company role
    const companyUser = await this.prisma.companyUser.findFirst({
      where: {
        userId: userId,
        companyId: companyId,
        isActive: true
      },
      include: {
        role: true
      }
    });

    if (!companyUser) {
      throw new NotFoundException('User not found in company or inactive');
    }

    // Check if user's role matches the leave attribute role
    if (leaveAttribute.role !== companyUser.role?.name) {
      throw new BadRequestException('Leave type not available for your role');
    }

    // 3. Check user's leave record and remaining days
    const currentYear = new Date().getFullYear();
    
    let userLeaveRecord = await this.prisma.usersLeaveRecord.findFirst({
      where: {
        userId: userId,
        leaveAttributeId: leaveTypeId,
        year: currentYear,
        companyUser: {
          companyId: companyId
        }
      }
    });

    // If no record exists, create one with allocated days
    if (!userLeaveRecord) {
      // userLeaveRecord = await this.prisma.usersLeaveRecord.create({
      //   data: {
      //     userId: userId,
      //     leaveAttributeId: leaveTypeId,
      //     year: currentYear,
      //     usedDays: 0,
      //     remainingDays: leaveAttribute.allocatedDays,
      //     carriedOverDays: 0,
      //     companyUserId: companyUser.id
      //   }
      // });
   throw new BadRequestException('No leave record found for this leave type. Please contact administrator.');
    }

    // Check if user has sufficient remaining days
    if (userLeaveRecord.remainingDays < leaveDays) {
      throw new BadRequestException(
        `Insufficient leave days. Requested: ${leaveDays}, Available: ${userLeaveRecord.remainingDays}`
      );
    }

    // Check for overlapping leave requests
    const overlappingLeave = await this.prisma.leave.findFirst({
      where: {
        userId: userId,
        companyId: companyId,
        status: {
          in: [LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.IN_REVIEW]
        },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate }
          }
        ]
      }
    });

    if (overlappingLeave) {
      throw new BadRequestException('You already have a leave request for this period');
    }

    // Start transaction for creating leave and updating leave record
    return await this.prisma.$transaction(async (tx) => {
      // 4. Create leave record
      const leave = await tx.leave.create({
        data: {
          userId: companyUser.id,
          companyId: companyId,
          leaveTypeId: leaveTypeId,
          startDate: startDate,
          endDate: endDate,
          reason: reason,
          status: status || 'PENDING',
          approverId: approverId,
          usersLeaveRecordId: userLeaveRecord.id
        },
        include: {
          leaveType: true,
          userLeave: {
            include: {
              user: true
            }
          }
        }
      });

      // Update user's leave record - decrease remaining days and increase used days
      // Only update if the leave is approved immediately
      if (status === LeaveStatus.APPROVED) {
        await tx.usersLeaveRecord.update({
          where: { id: userLeaveRecord.id },
          data: {
            remainingDays: userLeaveRecord.remainingDays - leaveDays,
            usedDays: userLeaveRecord.usedDays + leaveDays
          }
        });
      }

      // Create attachment if file exists
      if (file) {
        await tx.attachment.create({
          data: {
            userId: userId,
            leaveId: leave.id,
            attachment: file.path,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype
          }
        });
      }

      return {
        ...leave,
        leaveDays: leaveDays,
        previousRemainingDays: userLeaveRecord.remainingDays,
        newRemainingDays: status === LeaveStatus.APPROVED 
          ? userLeaveRecord.remainingDays - leaveDays 
          : userLeaveRecord.remainingDays
      };
    });
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  async findAll(options: FindAllOptions = {}) {
    const where: any = {};

    if (options.companyId) {
      where.companyId = options.companyId;
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.status) {
      where.status = options.status;
    }

    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [leaves, total] = await Promise.all([
      this.prisma.leave.findMany({
        where,
        include: {
          leaveType: true,
          userLeave: {
            include: {
              user: true
            }
          },
          approver: true,
          comments: {
            include: {
              user: true
            }
          },
          attachments: true,
          usersLeaveRecord: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.leave.count({ where })
    ]);

    return {
      data: leaves,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const leave = await this.prisma.leave.findUnique({
      where: { id },
      include: {
        leaveType: true,
        userLeave: {
          include: {
            user: true,
            role: true
          }
        },
        approver: true,
        comments: {
          include: {
            user: true
          },
          orderBy: { commentDate: 'asc' }
        },
        attachments: true,
        usersLeaveRecord: true
      }
    });

    if (!leave) {
      throw new NotFoundException(`Leave with ID ${id} not found`);
    }

    return leave;
  }

  async update(id: string, updateLeafDto: UpdateLeafDto) {
    const existingLeave = await this.findOne(id);

    if (updateLeafDto.startDate && updateLeafDto.endDate && 
        updateLeafDto.startDate >= updateLeafDto.endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // If dates are being updated, recalculate leave days and update user leave record
    if ((updateLeafDto.startDate || updateLeafDto.endDate) && 
        existingLeave.status === LeaveStatus.APPROVED) {
      throw new BadRequestException('Cannot change dates of an approved leave');
    }

    const updatedLeave = await this.prisma.leave.update({
      where: { id },
      data: {
        ...updateLeafDto,
        updatedAt: new Date()
      },
      include: {
        leaveType: true,
        userLeave: {
          include: {
            user: true
          }
        }
      }
    });

    return updatedLeave;
  }

  async remove(id: string) {
    const leave = await this.findOne(id);

    // If leave is approved, we need to restore the leave days
    if (leave.status === LeaveStatus.APPROVED && leave.usersLeaveRecordId) {
      const leaveDays = this.calculateWorkingDays(leave.startDate, leave.endDate);
      
      await this.prisma.$transaction(async (tx) => {
        // Restore leave days
        await tx.usersLeaveRecord.update({
          where: { id: leave.usersLeaveRecordId?.toString() },
          data: {
            remainingDays: { increment: leaveDays },
            usedDays: { decrement: leaveDays }
          }
        });

        // Delete leave
        await tx.leave.delete({
          where: { id }
        });
      });
    } else {
      await this.prisma.leave.delete({
        where: { id }
      });
    }
  }

 async approveLeave(id: string, approverId: string) {
  const leave = await this.prisma.leave.findUnique({ 
    where: { id },
    include: {
      leaveType: true,
      userLeave: {
        include: {
          user: true
        }
      }
    }
  });

  if (!leave) {
    throw new NotFoundException('Leave request not found');
  }

  // Check if leave is already approved
  if (leave.status === LeaveStatus.APPROVED) {
    return leave; // Already approved, just return
  }

  // Check if leave can be approved
  if (leave.status !== LeaveStatus.PENDING && leave.status !== LeaveStatus.IN_REVIEW) {
    throw new BadRequestException('Only pending or in-review leaves can be approved');
  }

  const leaveDays = this.calculateWorkingDays(leave.startDate, leave.endDate);

  return await this.prisma.$transaction(async (tx) => {
    // Update leave status
    const approvedLeave = await tx.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        approverId: approverId,
        updatedAt: new Date()
      },
      include: {
        leaveType: true,
        userLeave: {
          include: {
            user: true
          }
        }
      }
    });

    // Update user's leave record only if not already approved previously
    if (leave.usersLeaveRecordId) {
      await tx.usersLeaveRecord.update({
        where: { id: leave.usersLeaveRecordId },
        data: {
          remainingDays: { decrement: leaveDays },
          usedDays: { increment: leaveDays }
        }
      });
    }

    return approvedLeave;
  });
}

async changeLeaveStatus(id: string, approverId: string, status: LeaveStatus, reason?: string) {
  const leave = await this.prisma.leave.findUnique({ 
    where: { id },
    include: {
      leaveType: true,
      userLeave: {
        include: {
          user: true
        }
      }
    }
  });

  if (!leave) {
    throw new NotFoundException('Leave request not found');
  }

  // Check if the status change is valid
  this.validateStatusChange(leave.status, status);

  const leaveDays = this.calculateWorkingDays(leave.startDate, leave.endDate);

  return await this.prisma.$transaction(async (tx) => {
    // If changing from APPROVED to another status, restore leave days
    if (leave.status === LeaveStatus.APPROVED && leave.usersLeaveRecordId && status !== LeaveStatus.APPROVED) {
      await tx.usersLeaveRecord.update({
        where: { id: leave.usersLeaveRecordId },
        data: {
          remainingDays: { increment: leaveDays },
          usedDays: { decrement: leaveDays }
        }
      });
    }

    // If changing to APPROVED from another status, deduct leave days
    if (status === LeaveStatus.APPROVED && leave.usersLeaveRecordId && leave.status !== LeaveStatus.APPROVED) {
      await tx.usersLeaveRecord.update({
        where: { id: leave.usersLeaveRecordId },
        data: {
          remainingDays: { decrement: leaveDays },
          usedDays: { increment: leaveDays }
        }
      });
    }

    // Update leave status
    const updatedLeave = await tx.leave.update({
      where: { id },
      data: {
        status: status,
        approverId: approverId,
        updatedAt: new Date(),
        ...(reason && { rejectionReason: reason }) 
      },
      include: {
        leaveType: true,
        userLeave: {
          include: {
            user: true
          }
        }
      }
    });

    return updatedLeave;
  });
}
async rejectLeave(id: string, approverId: string, reason?: string) {
  const leave = await this.prisma.leave.findUnique({ 
    where: { id },
    include: {
      leaveType: true,
      userLeave: {
        include: {
          user: true
        }
      }
    }
  });

  if (!leave) {
    throw new NotFoundException('Leave request not found');
  }

  // Check if leave can be rejected
  const rejectableStatuses = [LeaveStatus.PENDING, LeaveStatus.IN_REVIEW, LeaveStatus.APPROVED];
  // if (!rejectableStatuses.includes(leave.status)) {
  //   throw new BadRequestException('Only pending, in-review, or approved leaves can be rejected');
  // }

  const leaveDays = this.calculateWorkingDays(leave.startDate, leave.endDate);

  return await this.prisma.$transaction(async (tx) => {
    // If leave was previously approved, restore the leave days
    if (leave.status === LeaveStatus.APPROVED && leave.usersLeaveRecordId) {
      await tx.usersLeaveRecord.update({
        where: { id: leave.usersLeaveRecordId },
        data: {
          remainingDays: { increment: leaveDays },
          usedDays: { decrement: leaveDays }
        }
      });
    }

    // Update leave status to REJECTED
    const rejectedLeave = await tx.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        approverId: approverId,
         reason,
        updatedAt: new Date()
      },
      include: {
        leaveType: true,
        userLeave: {
          include: {
            user: true
          }
        }
      }
    });

    return rejectedLeave;
  });
}

 async cancelLeave(id: string) {
  const leave = await this.prisma.leave.findUnique({
    where: { id },
    include: {
      leaveType: true,
      userLeave: {
        include: {
          user: true
        }
      }
    }
  });

  if (!leave) {
    throw new NotFoundException('Leave request not found');
  }

  if (leave.status === LeaveStatus.CANCELLED) {
    return leave; // Already cancelled
  }

  if (leave.status === LeaveStatus.APPROVED) {
    throw new BadRequestException('Approved leaves cannot be cancelled. Please contact administrator.');
  }

  const leaveDays = this.calculateWorkingDays(leave.startDate, leave.endDate);

  return await this.prisma.$transaction(async (tx) => {
    // Restore leave days if the leave was approved (though this shouldn't happen due to the check above)
    if (leave.usersLeaveRecordId && leave.status === LeaveStatus.APPROVED) {
      await tx.usersLeaveRecord.update({
        where: { id: leave.usersLeaveRecordId },
        data: {
          remainingDays: { increment: leaveDays },
          usedDays: { decrement: leaveDays }
        }
      });
    }

    // Update leave status to CANCELLED
    const cancelledLeave = await tx.leave.update({
      where: { id },
      data: {
        status: LeaveStatus.CANCELLED,
        updatedAt: new Date()
      },
      include: {
        leaveType: true,
        userLeave: {
          include: {
            user: true
          }
        }
      }
    });

    return cancelledLeave;
  });
}

async addComment(createCommentDto: CreateCommentDto) {
  const { userId, leaveId, comment } = createCommentDto;

  // Verify leave exists using the correct method
  const leave = await this.prisma.leave.findUnique({
    where: { id: leaveId },
    include: { company: true }
  });

  if (!leave) {
    throw new NotFoundException('Leave request not found');
  }

  // Verify user exists and has access
  const companyUser = await this.prisma.companyUser.findFirst({
    where: {
      id: userId,
      companyId: leave.companyId,
      isActive: true
    }
  });

  if (!companyUser) {
    throw new BadRequestException('User does not have access to this leave');
  }

  const newComment = await this.prisma.comment.create({
    data: {
      userId: userId,
      leaveId: leaveId,
      comment: comment,
      commentDate: new Date()
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      }
    }
  });

  return newComment;
}

  async getUserLeaves(userId: string, companyId?: string, year?: number) {
    const where: any = { userId };

    if (companyId) {
      where.companyId = companyId;
    }

    if (year) {
      where.OR = [
        {
          startDate: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`)
          }
        },
        {
          endDate: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`)
          }
        }
      ];
    }

    const leaves = await this.prisma.leave.findMany({
      where,
      include: {
        leaveType: true,
        userLeave: {
          include: {
            user: true
          }
        },
        approver: true,
        comments: {
          include: {
            user: true
          }
        },
        attachments: true,
        usersLeaveRecord: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return leaves;
  }

  async getCompanyLeaveStats(companyId: string) {
    const leaves = await this.prisma.leave.findMany({
      where: { companyId },
      select: { status: true }
    });

    const stats = {
      total: leaves.length,
      pending: leaves.filter(leave => leave.status === LeaveStatus.PENDING).length,
      approved: leaves.filter(leave => leave.status === LeaveStatus.APPROVED).length,
      rejected: leaves.filter(leave => leave.status === LeaveStatus.REJECTED).length,
      cancelled: leaves.filter(leave => leave.status === LeaveStatus.CANCELLED).length,
      inReview: leaves.filter(leave => leave.status === LeaveStatus.IN_REVIEW).length,
    };

    return stats;
  }

  async getUserLeaveBalance(userId: string, companyId: string, year?: number) {
    const currentYear = year || new Date().getFullYear();

    const userLeaveRecords = await this.prisma.usersLeaveRecord.findMany({
      where: {
        userId: userId,
        year: currentYear,
        companyUser: {
          companyId: companyId
        }
      },
      include: {
        leaveAttribute: true,
        carryForwardDays: true
      }
    });

    const leaves = await this.prisma.leave.findMany({
      where: {
        userId: userId,
        companyId: companyId,
        status: LeaveStatus.APPROVED,
        OR: [
          {
            startDate: {
              gte: new Date(`${currentYear}-01-01`),
              lte: new Date(`${currentYear}-12-31`)
            }
          },
          {
            endDate: {
              gte: new Date(`${currentYear}-01-01`),
              lte: new Date(`${currentYear}-12-31`)
            }
          }
        ]
      },
      include: {
        leaveType: true
      }
    });

    return {
      userId,
      companyId,
      year: currentYear,
      leaveRecords: userLeaveRecords,
      approvedLeaves: leaves,
      summary: userLeaveRecords.map(record => ({
        leaveType: record.leaveAttribute.leaveName,
        allocated: record.leaveAttribute.allocatedDays,
        used: record.usedDays,
        remaining: record.remainingDays,
        carriedOver: record.carriedOverDays
      }))
    };
  }
  private validateStatusChange(currentStatus: LeaveStatus, newStatus: LeaveStatus) {
  const validTransitions = {
    [LeaveStatus.PENDING]: [LeaveStatus.APPROVED, LeaveStatus.REJECTED, LeaveStatus.IN_REVIEW, LeaveStatus.CANCELLED],
    [LeaveStatus.IN_REVIEW]: [LeaveStatus.APPROVED, LeaveStatus.REJECTED, LeaveStatus.CANCELLED],
    [LeaveStatus.APPROVED]: [LeaveStatus.REJECTED, LeaveStatus.CANCELLED],
    [LeaveStatus.REJECTED]: [LeaveStatus.APPROVED, LeaveStatus.IN_REVIEW],
    [LeaveStatus.CANCELLED]: [LeaveStatus.PENDING, LeaveStatus.IN_REVIEW]
  };

  // if (!validTransitions[currentStatus]?.includes(newStatus)) {
  //   throw new BadRequestException(
  //     `Cannot change status from ${currentStatus} to ${newStatus}. Valid transitions: ${validTransitions[currentStatus]?.join(', ')}`
  //   );
  // }
}
}