import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveTypeAllocationDto } from './dto/create-leave-type-allocation.dto';
import { QueryLeaveTypeAllocationDto } from './dto/query-leave-type-allocation.dto';
import { QueryUsersLeaveRecordDto } from './dto/query-users-leave-record.dto';
import { CreateCarryForwardDaysDto } from './dto/create-carry-forward-days.dto';
import { UpdateLeaveTypeAllocationDto } from './dto/update-leave-type-allocation.dto';

@Injectable()
export class LeaveTypeAllocationService {
  constructor(private prisma: PrismaService) {}

  async create(createLeaveTypeAllocationDto: CreateLeaveTypeAllocationDto) {
    const { companyId, createdById, leaveAttributes } = createLeaveTypeAllocationDto;

    await this.validateDateConstraints(leaveAttributes);

    // Verify company exists
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Company not found');

    // Verify creator belongs to company
    const creator = await this.prisma.companyUser.findFirst({
      where: { id: createdById, companyId, isActive: true },
    });
    if (!creator) throw new NotFoundException('Creator not found or inactive in company');

    // Expand roles if array
    const expandedAttributes = leaveAttributes.flatMap((attr) =>
      Array.isArray(attr.role)
        ? attr.role.map((role) => ({ ...attr, role }))
        : [attr]
    );

    return await this.prisma.$transaction(async (tx) => {
      // Check if allocation already exists
      let allocation:any = await tx.leaveTypeAllocation.findFirst({
        where: { companyId },
        include: { leaveAttributes: true },
      });

      const allCompanyUsers = await tx.companyUser.findMany({
        where: { companyId, isActive: true, status: 'ACTIVE' },
        include: { role: true },
      });

      // CASE 1: Existing allocation add new attributes
      if (allocation) {
        const newAttributes: any[] = [];

        for (const attr of expandedAttributes) {
          const duplicate = allocation.leaveAttributes.find(
            (existing) =>
              existing.leaveName.toLowerCase() === attr.leaveName.toLowerCase() &&
              existing.role.toLowerCase() === attr.role.toLowerCase() &&
              existing.year === attr.year
          );

          if (duplicate) {
            throw new ConflictException(
              `Duplicate leave type '${attr.leaveName}' for role '${attr.role}' in year ${attr.year} already exists.`
            );
          } else {
            newAttributes.push(attr);
          }
        }

        if (newAttributes.length > 0) {
          // Create new LeaveAttributes
          const createdAttributes = await Promise.all(
            newAttributes.map(async (attr) => {
              const created = await tx.leaveAttribute.create({
                data: {
                  leaveTypeAllocationId: allocation.id,
                  year: attr.year,
                  leaveName: attr.leaveName,
                  role: attr.role,
                  allocatedDays: attr.allocatedDays,
                  isActive: attr.isActive ?? true,
                },
              });

              // For each created attribute, create UsersLeaveRecord
              const matchingUsers = allCompanyUsers.filter(
                (u) => u.role?.name?.toLowerCase() === attr.role.toLowerCase()
              );

              for (const user of matchingUsers) {
                const existingRecord = await tx.usersLeaveRecord.findFirst({
                  where: {
                    companyUserId: user.id,
                    leaveAttributeId: created.id,
                  },
                });

                if (!existingRecord) {
                  await tx.usersLeaveRecord.create({
                    data: {
                      userId: user.userId,
                      companyUserId: user.id,
                      leaveAttributeId: created.id,
                      year: attr.year,
                      usedDays: 0,
                      remainingDays: attr.allocatedDays,
                      carriedOverDays: 0,
                    },
                  });
                }
              }

              return created;
            })
          );

          return {
            message: `Leave attributes added and user leave records created for company ${companyId}`,
            addedCount: createdAttributes.length,
          };
        }

        return {
          message: 'No new leave attributes added',
          addedCount: 0,
        };
      }

      // CASE 2: New allocation , Create allocation + attributes + records
      allocation = await tx.leaveTypeAllocation.create({
        data: {
          companyId,
          createdById,
          leaveAttributes: {
            create: expandedAttributes.map((attr) => ({
              year: attr.year,
              leaveName: attr.leaveName,
              role: attr.role,
              allocatedDays: attr.allocatedDays,
              isActive: attr.isActive ?? true,
            })),
          },
        },
        include: { leaveAttributes: true },
      });

      // For each new attribute, create UsersLeaveRecord
      for (const attribute of allocation.leaveAttributes) {
        const matchingUsers = allCompanyUsers.filter(
          (u) => u.role?.name?.toLowerCase() === attribute.role.toLowerCase()
        );

        for (const user of matchingUsers) {
          await tx.usersLeaveRecord.create({
            data: {
              userId: user.userId,
              companyUserId: user.id,
              leaveAttributeId: attribute.id,
              year: attribute.year,
              usedDays: 0,
              remainingDays: attribute.allocatedDays,
              carriedOverDays: 0,
            },
          });
        }
      }

      return {
        message: 'New leave type allocation and user leave records created successfully',
        allocation,
      };
    });
  }

  async findAll(query: QueryLeaveTypeAllocationDto) {
    const { leaveName, role, allocatedDays, year, companyId, isActive } = query;

    const where: any = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (leaveName || role || allocatedDays || year || isActive !== undefined) {
      where.leaveAttributes = {
        some: {}
      };

      if (leaveName) {
        where.leaveAttributes.some.leaveName = { contains: leaveName, mode: 'insensitive' };
      }

      if (role) {
        where.leaveAttributes.some.role = { contains: role, mode: 'insensitive' };
      }

      if (allocatedDays) {
        where.leaveAttributes.some.allocatedDays = allocatedDays;
      }

      if (year) {
        where.leaveAttributes.some.year = year;
      }

      if (isActive !== undefined) {
        where.leaveAttributes.some.isActive = isActive;
      }
    }

    return await this.prisma.leaveTypeAllocation.findMany({
      where,
      include: {
        leaveAttributes: {
          where: {
            ...(leaveName && { leaveName: { contains: leaveName, mode: 'insensitive' } }),
            ...(role && { role: { contains: role, mode: 'insensitive' } }),
            ...(allocatedDays && { allocatedDays }),
            ...(year && { year }),
            ...(isActive !== undefined && { isActive })
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  async findOne(id: string) {
    const allocation = await this.prisma.leaveTypeAllocation.findUnique({
      where: { id },
      include: {
        leaveAttributes: true,
        company: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!allocation) {
      throw new NotFoundException('Leave type allocation not found');
    }

    return allocation;
  }

  async findByCompanyId(companyId: string) {
    const allocation = await this.prisma.leaveTypeAllocation.findFirst({
      where: { companyId },
      include: {
        leaveAttributes: {
          where: { isActive: true }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!allocation) {
      throw new NotFoundException('Leave type allocation not found for this company');
    }

    return allocation;
  }

 async update(
  id: string,
  updateLeaveTypeAllocationDto: UpdateLeaveTypeAllocationDto
) {
  const { leaveAttributes, ...updateData } = updateLeaveTypeAllocationDto;

  return await this.prisma.$transaction(async (tx) => {
    // 1️⃣ Update main allocation if needed
    if (Object.keys(updateData).length > 0) {
      await tx.leaveTypeAllocation.update({
        where: { id },
        data: updateData,
      });
    }

    // 2️⃣ Process leaveAttributes
    if (leaveAttributes && leaveAttributes.length > 0) {
      for (const attr of leaveAttributes) {
        // Check if leaveAttribute exists by id
        let existingAttr:any = null;
        if (attr.id && attr.id.trim() !== '') {
          existingAttr = await tx.leaveAttribute.findUnique({
            where: { id: attr.id },
            include: {
              usersLeaveRecords: true
            }
          });
        }

        if (existingAttr) {
          // Prepare update data for leave attribute
          const updateAttributeData: any = {};
          
          if (attr.leaveName !== undefined) updateAttributeData.leaveName = attr.leaveName;
          if (attr.role !== undefined) updateAttributeData.role = attr.role;
          if (attr.year !== undefined) updateAttributeData.year = attr.year;
          if (attr.allocatedDays !== undefined) updateAttributeData.allocatedDays = attr.allocatedDays;
          if (attr.isActive !== undefined) updateAttributeData.isActive = attr.isActive;

          // Update existing leaveAttribute if there are changes
          if (Object.keys(updateAttributeData).length > 0) {
            await tx.leaveAttribute.update({
              where: { id: existingAttr.id },
              data: updateAttributeData,
            });

            // Handle user leave records updates based on what changed
            if (existingAttr.usersLeaveRecords.length > 0) {
              const needsUserRecordUpdate = 
                attr.allocatedDays !== undefined || 
                attr.role !== undefined || 
                attr.year !== undefined;

              if (needsUserRecordUpdate) {
                await this.handleUserLeaveRecordsUpdate(tx, existingAttr, attr);
              }
            }
          }
        } else {
          // Create new leaveAttribute
          await this.createNewLeaveAttribute(tx, id, attr);
        }
      }
    }

    // 3️⃣ Return updated allocation with attributes
    return await tx.leaveTypeAllocation.findUnique({
      where: { id },
      include: {
        leaveAttributes: true,
        company: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  });
}


  async remove(id: string) {
    const allocation = await this.prisma.leaveTypeAllocation.findUnique({
      where: { id },
      include: { leaveAttributes: true },
    });

    if (!allocation) {
      throw new NotFoundException('Leave type allocation not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Delete related records
      for (const attribute of allocation.leaveAttributes) {
        await tx.usersLeaveRecord.deleteMany({
          where: { leaveAttributeId: attribute.id },
        });
      }

      await tx.leaveAttribute.deleteMany({
        where: { leaveTypeAllocationId: id },
      });

      await tx.leaveTypeAllocation.delete({
        where: { id },
      });

      return { message: 'Leave type allocation deleted successfully' };
    });
  }

  async removeAttributes(attributeIds: string[]) {
    if (!attributeIds || attributeIds.length === 0) {
      throw new BadRequestException('No leave attribute IDs provided');
    }

    const existingAttributes = await this.prisma.leaveAttribute.findMany({
      where: { id: { in: attributeIds } },
      include: { leaveTypeAllocation: true },
    });

    if (existingAttributes.length === 0) {
      throw new NotFoundException('No matching leave attributes found');
    }

    return await this.prisma.$transaction(async (tx) => {
      await tx.usersLeaveRecord.deleteMany({
        where: { leaveAttributeId: { in: attributeIds } },
      });

      await tx.leaveAttribute.deleteMany({
        where: { id: { in: attributeIds } },
      });

      return { message: 'Selected leave attributes deleted successfully' };
    });
  }

  // UsersLeaveRecord Methods
  async findAllUsersLeaveRecords(query: QueryUsersLeaveRecordDto) {
    const { userId, companyUserId, leaveAttributeId, year, usedDays, remainingDays } = query;

    const where: any = {};

    if (userId) where.userId = userId;
    if (companyUserId) where.companyUserId = companyUserId;
    if (leaveAttributeId) where.leaveAttributeId = leaveAttributeId;
    if (year) where.year = year;
    if (usedDays) where.usedDays = usedDays;
    if (remainingDays) where.remainingDays = remainingDays;

    return await this.prisma.usersLeaveRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          }
        },
        companyUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          }
        },
        leaveAttribute: true,
        carryForwardDays: true,
        leaves: true,
      }
    });
  }

async findUsersLeaveRecord(id: string) {
  const record = await this.prisma.usersLeaveRecord.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        }
      },
      companyUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: {
            select: {
              id: true,
              name: true
            }
          },
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      leaveAttribute: {
        select: {
          id: true,
          leaveName: true,
          year: true,
          allocatedDays: true,
          isActive: true,
          role: true
        }
      },
      carryForwardDays: {
        orderBy: { year: 'desc' }
      },
      leaves: {
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          reason: true,
          createdAt: true
        }
      }
    }
  });

  if (!record) {
    throw new NotFoundException('User leave record not found');
  }

  return record;
}
async findUserLeaveRecordsByCompanyUser(companyUserId: string) {
  const companyUser = await this.prisma.companyUser.findUnique({
    where: { id: companyUserId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        }
      },
      company: {
        select: {
          id: true,
          name: true,
        }
      },
      role: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  });

  if (!companyUser) {
    throw new NotFoundException('Company user not found');
  }

  if (!companyUser.isActive || companyUser.status !== 'ACTIVE') {
    throw new BadRequestException('Company user is not active');
  }

  // Get all leave records for this company user
  const records = await this.prisma.usersLeaveRecord.findMany({
    where: { 
      companyUserId,
      leaveAttribute: {
        isActive: true // Only include active leave attributes
      }
    },
    include: {
      leaveAttribute: {
        select: {
          id: true,
          leaveName: true,
          year: true,
          allocatedDays: true,
          isActive: true,
          role: true
        }
      },
      carryForwardDays: {
        orderBy: { year: 'desc' },
        select: {
          id: true,
          days: true,
          year: true,
          createdAt: true
        }
      },
      leaves: {
        orderBy: { startDate: 'desc' },
        where: {
          status: {
            in: ['APPROVED', 'PENDING', 'IN_REVIEW']
          }
        },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          reason: true,
          createdAt: true,
          updatedAt: true,
          approver: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }
    },
    orderBy: [
      { year: 'desc' },
      { leaveAttribute: { leaveName: 'asc' } }
    ]
  });

  // Calculate summary statistics
  const currentYear = new Date().getFullYear();
  const summary = this.calculateLeaveSummaryByCompanyUser(records, currentYear);

  return {
    userInfo: {
      userId: companyUser.user.id,
      email: companyUser.user.email,
      companyUserId: companyUser.id,
      firstName: companyUser.firstName,
      lastName: companyUser.lastName,
      fullName: `${companyUser.firstName} ${companyUser.lastName}`.trim(),
      company: {
        id: companyUser.company.id,
        name: companyUser.company.name
      },
      role: companyUser.role,
      status: companyUser.status,
      isActive: companyUser.isActive
    },
    leaveRecords: records,
    summary,
    currentYear
  };
}

// Add this new method for getting all records by userId
async findUserLeaveRecords(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      companyUsers: {
        include: {
          company: true,
          role: true
        }
      }
    }
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  const records = await this.prisma.usersLeaveRecord.findMany({
    where: { userId },
    include: {
      companyUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: {
            select: {
              id: true,
              name: true
            }
          },
          company: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      leaveAttribute: {
        select: {
          id: true,
          leaveName: true,
          year: true,
          allocatedDays: true,
          isActive: true,
          role: true
        }
      },
      carryForwardDays: {
        orderBy: { year: 'desc' }
      },
      leaves: {
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          reason: true,
          leaveType: {
            select: {
              leaveName: true
            }
          }
        }
      }
    },
    orderBy: [
      { year: 'desc' },
      { leaveAttribute: { leaveName: 'asc' } }
    ]
  });

  if (!records || records.length === 0) {
    throw new NotFoundException('No leave records found for this user');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      companyUsers: user.companyUsers.map(cu => ({
        id: cu.id,
        firstName: cu.firstName,
        lastName: cu.lastName,
        company: cu.company,
        role: cu.role
      }))
    },
    leaveRecords: records,
    summary: this.calculateLeaveSummary(records)
  };
}

  async updateUsersLeaveRecordUsedDays(id: string, usedDays: number) {
    const record:any = await this.prisma.usersLeaveRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('User leave record not found');
    }

    if (usedDays < 0) {
      throw new BadRequestException('Used days cannot be negative');
    }

    if (usedDays > record.remainingDays + record.carriedOverDays) {
      throw new BadRequestException('Used days exceed available days');
    }

    const newRemainingDays = record.allocatedDays - usedDays + record.carriedOverDays;

    return await this.prisma.usersLeaveRecord.update({
      where: { id },
      data: {
        usedDays,
        remainingDays: newRemainingDays,
      },
      include: {
        leaveAttribute: true,
      }
    });
  }

  // CarryForwardDays Methods
  async createCarryForwardDays(createCarryForwardDaysDto: CreateCarryForwardDaysDto) {
    const { usersLeaveRecordId, days, year } = createCarryForwardDaysDto;

    const userRecord = await this.prisma.usersLeaveRecord.findUnique({
      where: { id: usersLeaveRecordId },
    });

    if (!userRecord) {
      throw new NotFoundException('User leave record not found');
    }

    if (days <= 0) {
      throw new BadRequestException('Carry forward days must be positive');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create carry forward record
      const carryForward = await tx.carryForwardDays.create({
        data: {
          usersLeaveRecordId,
          days,
          year,
        },
      });

      // Update user record
      await tx.usersLeaveRecord.update({
        where: { id: usersLeaveRecordId },
        data: {
          carriedOverDays: userRecord.carriedOverDays + days,
          remainingDays: userRecord.remainingDays + days,
        },
      });

      return carryForward;
    });
  }

  async findCarryForwardDaysByUserRecord(usersLeaveRecordId: string) {
    const userRecord = await this.prisma.usersLeaveRecord.findUnique({
      where: { id: usersLeaveRecordId },
    });

    if (!userRecord) {
      throw new NotFoundException('User leave record not found');
    }

    return await this.prisma.carryForwardDays.findMany({
      where: { usersLeaveRecordId },
      orderBy: { year: 'desc' },
    });
  }

  async removeCarryForwardDays(id: string) {
    const carryForward = await this.prisma.carryForwardDays.findUnique({
      where: { id },
      include: { usersLeaveRecord: true },
    });

    if (!carryForward) {
      throw new NotFoundException('Carry forward record not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update user record
      await tx.usersLeaveRecord.update({
        where: { id: carryForward.usersLeaveRecordId },
        data: {
          carriedOverDays: carryForward.usersLeaveRecord.carriedOverDays - carryForward.days,
          remainingDays: carryForward.usersLeaveRecord.remainingDays - carryForward.days,
        },
      });

      // Delete carry forward record
      await tx.carryForwardDays.delete({
        where: { id },
      });

      return { message: 'Carry forward record deleted successfully' };
    });
  }

  private async validateDateConstraints(leaveAttributes: any[]): Promise<void> {
    const currentYear = new Date().getFullYear();

    for (const attr of leaveAttributes) {
      if (attr.year < currentYear) {
        throw new BadRequestException(`Year ${attr.year} cannot be in the past`);
      }
    }
  }
  private async handleUserLeaveRecordsUpdate(
  tx: any,
  existingAttr: any,
  updatedAttr: any
) {
  const userRecords = await tx.usersLeaveRecord.findMany({
    where: { leaveAttributeId: existingAttr.id },
    include: {
      companyUser: {
        include: { role: true }
      }
    }
  });

  for (const record of userRecords) {
    // Case 1: Role changed - check if user still matches the new role
    if (updatedAttr.role !== undefined && updatedAttr.role !== existingAttr.role) {
      const userRoleMatches = record.companyUser.role?.name?.toLowerCase() === updatedAttr.role.toLowerCase();
      
      if (!userRoleMatches) {
        // User no longer matches the role, delete their record
        await tx.usersLeaveRecord.delete({
          where: { id: record.id }
        });
        continue; // Skip to next record
      }
    }

    // Case 2: Allocated days changed - recalculate remaining days
    let newRemainingDays = record.remainingDays;
    if (updatedAttr.allocatedDays !== undefined) {
      newRemainingDays = updatedAttr.allocatedDays - record.usedDays + record.carriedOverDays;
    }

    // Case 3: Year changed - update year
    const newYear = updatedAttr.year !== undefined ? updatedAttr.year : record.year;

    // Update the user leave record
    await tx.usersLeaveRecord.update({
      where: { id: record.id },
      data: {
        ...(updatedAttr.year !== undefined && { year: newYear }),
        ...(updatedAttr.allocatedDays !== undefined && { remainingDays: newRemainingDays }),
      },
    });
  }

  // If role changed, create new records for users who now match the role
  if (updatedAttr.role !== undefined && updatedAttr.role !== existingAttr.role) {
    await this.createUserRecordsForNewRole(tx, existingAttr, updatedAttr);
  }
}

private async createNewLeaveAttribute(
  tx: any,
  allocationId: string,
  attr: any
) {
  // Validate required fields for new attribute
  if (!attr.year || !attr.leaveName || !attr.role || attr.allocatedDays === undefined) {
    throw new BadRequestException(
      'New leave attributes must include year, leaveName, role, and allocatedDays'
    );
  }

  const createdAttr = await tx.leaveAttribute.create({
    data: {
      leaveTypeAllocationId: allocationId,
      year: attr.year,
      leaveName: attr.leaveName,
      role: attr.role,
      allocatedDays: attr.allocatedDays,
      isActive: attr.isActive ?? true,
    },
  });

  // Create UsersLeaveRecord for matching users
  const allocation = await tx.leaveTypeAllocation.findUnique({
    where: { id: allocationId },
    include: { company: true },
  });

  if (allocation) {
    await this.createUserRecordsForNewRole(tx, createdAttr, attr);
  }

  return createdAttr;
}

private async createUserRecordsForNewRole(
  tx: any,
  leaveAttribute: any,
  attr: any
) {
  const allocation = await tx.leaveTypeAllocation.findUnique({
    where: { id: leaveAttribute.leaveTypeAllocationId || leaveAttribute.id },
    include: { company: true },
  });

  if (!allocation) return;

  const companyUsers = await tx.companyUser.findMany({
    where: {
      companyId: allocation.companyId,
      isActive: true,
      status: 'ACTIVE',
    },
    include: { role: true },
  });

  const matchingUsers = companyUsers.filter(
    (u) => u.role?.name?.toLowerCase() === attr.role.toLowerCase()
  );

  for (const user of matchingUsers) {
    // Check if record already exists
    const existingRecord = await tx.usersLeaveRecord.findFirst({
      where: {
        companyUserId: user.id,
        leaveAttributeId: leaveAttribute.id,
      },
    });

    if (!existingRecord) {
      await tx.usersLeaveRecord.create({
        data: {
          userId: user.userId,
          companyUserId: user.id,
          leaveAttributeId: leaveAttribute.id,
          year: attr.year || leaveAttribute.year,
          usedDays: 0,
          remainingDays: attr.allocatedDays || leaveAttribute.allocatedDays,
          carriedOverDays: 0,
        },
      });
    }
  }
}
private calculateLeaveSummary(records: any[]) {
  const currentYear = new Date().getFullYear();
  
  const currentYearRecords = records.filter(record => record.year === currentYear);
  const totalAllocated = currentYearRecords.reduce((sum, record) => sum + record.leaveAttribute.allocatedDays, 0);
  const totalUsed = currentYearRecords.reduce((sum, record) => sum + record.usedDays, 0);
  const totalRemaining = currentYearRecords.reduce((sum, record) => sum + record.remainingDays, 0);
  const totalCarriedOver = currentYearRecords.reduce((sum, record) => sum + record.carriedOverDays, 0);

  return {
    currentYear,
    totalAllocated,
    totalUsed,
    totalRemaining,
    totalCarriedOver,
    byLeaveType: currentYearRecords.map(record => ({
      leaveName: record.leaveAttribute.leaveName,
      allocated: record.leaveAttribute.allocatedDays,
      used: record.usedDays,
      remaining: record.remainingDays,
      carriedOver: record.carriedOverDays
    }))
  };
}
private calculateLeaveSummaryByCompanyUser(records: any[], currentYear: number) {
  // Current year records
  const currentYearRecords = records.filter(record => record.year === currentYear);
  
  // All records grouped by year
  const recordsByYear = records.reduce((acc, record) => {
    if (!acc[record.year]) {
      acc[record.year] = [];
    }
    acc[record.year].push(record);
    return acc;
  }, {});

  // Calculate totals for current year
  const currentYearSummary = {
    totalAllocated: currentYearRecords.reduce((sum, record) => sum + record.leaveAttribute.allocatedDays, 0),
    totalUsed: currentYearRecords.reduce((sum, record) => sum + record.usedDays, 0),
    totalRemaining: currentYearRecords.reduce((sum, record) => sum + record.remainingDays, 0),
    totalCarriedOver: currentYearRecords.reduce((sum, record) => sum + record.carriedOverDays, 0),
    byLeaveType: currentYearRecords.map(record => ({
      leaveAttributeId: record.leaveAttribute.id,
      leaveName: record.leaveAttribute.leaveName,
      allocated: record.leaveAttribute.allocatedDays,
      used: record.usedDays,
      remaining: record.remainingDays,
      carriedOver: record.carriedOverDays,
      utilizationRate: Math.round((record.usedDays / record.leaveAttribute.allocatedDays) * 100)
    }))
  };

  // Summary by year
  const yearlySummary = Object.keys(recordsByYear).map(year => {
    const yearRecords = recordsByYear[year];
    return {
      year: parseInt(year),
      totalAllocated: yearRecords.reduce((sum, record) => sum + record.leaveAttribute.allocatedDays, 0),
      totalUsed: yearRecords.reduce((sum, record) => sum + record.usedDays, 0),
      totalRemaining: yearRecords.reduce((sum, record) => sum + record.remainingDays, 0),
      leaveTypes: yearRecords.map(record => ({
        leaveName: record.leaveAttribute.leaveName,
        allocated: record.leaveAttribute.allocatedDays,
        used: record.usedDays,
        remaining: record.remainingDays
      }))
    };
  }).sort((a, b) => b.year - a.year); // Sort by year descending

  return {
    currentYear: currentYearSummary,
    yearlySummary,
    overall: {
      totalLeaveTypes: records.length,
      activeYears: Object.keys(recordsByYear).length,
      latestYear: Math.max(...records.map(r => r.year)),
      hasCarryOver: records.some(r => r.carriedOverDays > 0)
    }
  };
}
}