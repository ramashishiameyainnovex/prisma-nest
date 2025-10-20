import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeaveTypeAllocationDto } from './dto/create-leave-type-allocation.dto';
import { UpdateLeaveTypeAllocationDto } from './dto/update-leave-type-allocation.dto';
import { QueryLeaveTypeAllocationDto } from './dto/query-leave-type-allocation.dto';

@Injectable()
export class LeaveTypeAllocationService {
  constructor(private prisma: PrismaService) {}

async create(createLeaveTypeAllocationDto: CreateLeaveTypeAllocationDto) {
  const { companyId, createdById, leaveAttributes } = createLeaveTypeAllocationDto;

  await this.validateDateConstraints(leaveAttributes);

  // 1 Verify company exists
  const company = await this.prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) throw new NotFoundException('Company not found');

  // 2 Verify  belongs to company
  const creator = await this.prisma.companyUser.findFirst({
    where: { id: createdById, companyId, isActive: true },
  });
  if (!creator) throw new NotFoundException('Creator not found or inactive in company');

  // 3 Expand roles if array (so each attribute gets its own record)
  const expandedAttributes = leaveAttributes.flatMap((attr) =>
    Array.isArray(attr.role)
      ? attr.role.map((role) => ({ ...attr, role }))
      : [attr]
  );

  return await this.prisma.$transaction(async (tx) => {
    // 4 Check if allocation already exists
    let allocation: any = await tx.leaveTypeAllocation.findFirst({
      where: { companyId },
      include: { leaveAttributes: true },
    });

    const allCompanyUsers = await tx.companyUser.findMany({
      where: { companyId, isActive: true, status: 'ACTIVE' },
      include: { role: true },
    });

    // -----------------------------------------------------
    // CASE 1: Existing allocation → Add new attributes
    // -----------------------------------------------------
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
        // 5 Create new LeaveAttributes
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

            // 6 For each created attribute, create UsersLeaveRecord
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

    // -----------------------------------------------------
    // CASE 2: New allocation → Create allocation + attributes + records
    // -----------------------------------------------------
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

    // 7 For each new attribute, create UsersLeaveRecord
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
    const { leaveName, role, allocatedDays, year, companyId } = query;

    const where: any = {};

    if (companyId) {
      where.companyId = companyId;
    }

    if (leaveName || role || allocatedDays || year) {
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
    }

    return await this.prisma.leaveTypeAllocation.findMany({
      where,
      include: {
        leaveAttributes: {
          where: {
            ...(leaveName && { leaveName: { contains: leaveName, mode: 'insensitive' } }),
            ...(role && { role: { contains: role, mode: 'insensitive' } }),
            ...(allocatedDays && { allocatedDays }),
            ...(year && { year })
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
        // a) Check if leaveAttribute exists by id
        let existingAttr:any = null;
        if ('id' in attr && typeof attr.id === 'string' && attr.id.trim() !== '') {
          existingAttr = await tx.leaveAttribute.findUnique({
            where: { id: attr.id },
          });
        }

        if (existingAttr) {
          // b) Update existing leaveAttribute
          await tx.leaveAttribute.update({
            where: { id: existingAttr.id },
            data: {
              allocatedDays: attr.allocatedDays ?? existingAttr.allocatedDays,
              isActive: attr.isActive ?? existingAttr.isActive,
              year: attr.year ?? existingAttr.year,
              leaveName: attr.leaveName ?? existingAttr.leaveName,
              role: attr.role ?? existingAttr.role,
            },
          });

          // c) Update usersLeaveRecord if allocatedDays changed
          if (attr.allocatedDays !== undefined) {
            const userRecords = await tx.usersLeaveRecord.findMany({
              where: { leaveAttributeId: existingAttr.id },
            });

            for (const record of userRecords) {
              const newRemainingDays =
                attr.allocatedDays - record.usedDays + record.carriedOverDays;
              await tx.usersLeaveRecord.update({
                where: { id: record.id },
                data: { remainingDays: newRemainingDays },
              });
            }
          }
        } else {
          // d) Create new leaveAttribute
          const createdAttr = await tx.leaveAttribute.create({
            data: {
              leaveTypeAllocationId: id,
              year: attr.year,
              leaveName: attr.leaveName,
              role: attr.role,
              allocatedDays: attr.allocatedDays,
              isActive: attr.isActive ?? true,
            },
          });

          // e) Create UsersLeaveRecord for matching users
          const allocation = await tx.leaveTypeAllocation.findUnique({
            where: { id },
            include: { company: true },
          });

          if (allocation) {
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
              await tx.usersLeaveRecord.create({
                data: {
                  userId: user.userId,
                  companyUserId: user.id,
                  leaveAttributeId: createdAttr.id,
                  year: attr.year,
                  usedDays: 0,
                  remainingDays: attr.allocatedDays,
                  carriedOverDays: 0,
                },
              });
            }
          }
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
    // 1️⃣ Delete all UsersLeaveRecord linked to leaveAttributes
    const attributeIds = allocation.leaveAttributes.map((a) => a.id);

    if (attributeIds.length > 0) {
      await tx.usersLeaveRecord.deleteMany({
        where: { leaveAttributeId: { in: attributeIds } },
      });
    }

    // 2️⃣ Delete related leaveAttributes
    await tx.leaveAttribute.deleteMany({
      where: { leaveTypeAllocationId: id },
    });

    // 3️⃣ Delete main allocation
    return await tx.leaveTypeAllocation.delete({
      where: { id },
    });
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
}