import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShiftAttributeAssignment } from '@prisma/client';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';
import { FilterShiftDto } from './dto/filter-shift.dto';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  async create(createShiftDto: CreateShiftDto) {
    try {
      // Check if company exists
      const company = await this.prisma.company.findUnique({
        where: { id: createShiftDto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      // Check if user exists and belongs to the company
      const createdByUser = await this.prisma.companyUser.findUnique({
        where: { id: createShiftDto.shiftCreatedBy },
        include: { company: true },
      });

      if (!createdByUser) {
        throw new NotFoundException('User not found');
      }

      if (createdByUser.companyId !== createShiftDto.companyId) {
        throw new BadRequestException('User does not belong to the specified company');
      }

      // Create shift with attributes and assignments in transaction
      const shift = await this.prisma.$transaction(async (prisma) => {
        const shift = await prisma.shift.create({
          data: {
            companyId: createShiftDto.companyId,
            shiftCreatedBy: createShiftDto.shiftCreatedBy,
          },
        });

        // Create shift attributes
        for (const attribute of createShiftDto.shiftAttributes) {
          const shiftAttribute = await prisma.shiftAttribute.create({
            data: {
              shiftId: shift.id,
              shiftName: attribute.shiftName,
              startTime: new Date(attribute.startTime),
              endTime: new Date(attribute.endTime),
              breakDuration: attribute.breakDuration ? parseInt(attribute.breakDuration) : null,
              gracePeriodMinutes: attribute.gracePeriodMinutes ? parseInt(attribute.gracePeriodMinutes) : null,
              description: attribute.description,
              color: attribute.color,
              isActive: true,
            },
          });

          // Create assignments if provided
          if (attribute.assignedUserIds && attribute.assignedUserIds.length > 0) {
            for (const userId of attribute.assignedUserIds) {
              // Verify user belongs to the same company
              const user = await prisma.companyUser.findUnique({
                where: { id: userId },
              });

              if (user && user.companyId === createShiftDto.companyId) {
                await prisma.shiftAttributeAssignment.create({
                  data: {
                    shiftAttributeId: shiftAttribute.id,
                    assignedUserId: userId,
                  },
                });
              }
            }
          }
        }

        return prisma.shift.findUnique({
          where: { id: shift.id },
          include: {
            company: { select: { id: true, name: true } },
            createdBy: { 
              include: { 
                user: { select: { id: true, email: true } } 
              } 
            },
            shiftAttributes: {
              include: {
                assignments: {
                  include: {
                    assignedUser: {
                      include: {
                        user: { select: { id: true, email: true } }
                      }
                    }
                  }
                }
              }
            }
          },
        });
      });

      return {
        message: 'Shift created successfully',
        data: shift,
      };
    } catch (error) {
      console.error('Error creating shift:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create shift');
    }
  }

  async findAll(filterShiftDto: FilterShiftDto) {
    try {
      const where: any = {};

      if (filterShiftDto.companyId) {
        where.companyId = filterShiftDto.companyId;
      }

      if (filterShiftDto.createdBy) {
        where.shiftCreatedBy = filterShiftDto.createdBy;
      }

      if (filterShiftDto.shiftName) {
        where.shiftAttributes = {
          some: {
            shiftName: {
              contains: filterShiftDto.shiftName,
              mode: 'insensitive',
            },
          },
        };
      }

      if (filterShiftDto.startDateFrom || filterShiftDto.startDateTo) {
        where.shiftAttributes = {
          some: {
            AND: [
              filterShiftDto.startDateFrom ? { startTime: { gte: new Date(filterShiftDto.startDateFrom) } } : {},
              filterShiftDto.startDateTo ? { startTime: { lte: new Date(filterShiftDto.startDateTo) } } : {},
            ],
          },
        };
      }

      if (filterShiftDto.assignedUserId) {
        where.shiftAttributes = {
          some: {
            assignments: {
              some: {
                assignedUserId: filterShiftDto.assignedUserId,
              },
            },
          },
        };
      }

      if (filterShiftDto.isActive !== undefined) {
        where.shiftAttributes = {
          some: {
            isActive: filterShiftDto.isActive,
          },
        };
      }

      const shifts = await this.prisma.shift.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          createdBy: { 
            include: { 
              user: { select: { id: true, email: true } } 
            } 
          },
          shiftAttributes: {
            where: filterShiftDto.isActive !== undefined ? { isActive: filterShiftDto.isActive } : {},
            include: {
              assignments: {
                include: {
                  assignedUser: {
                    include: {
                      user: { select: { id: true, email: true } }
                    }
                  }
                }
              }
            }
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        message: 'Shifts retrieved successfully',
        data: shifts,
      };
    } catch (error) {
      console.error('Error retrieving shifts:', error);
      throw new InternalServerErrorException('Failed to retrieve shifts');
    }
  }

  async findOne(id: string) {
    try {
      const shift = await this.prisma.shift.findUnique({
        where: { id },
        include: {
          company: { select: { id: true, name: true } },
          createdBy: { 
            include: { 
              user: { select: { id: true, email: true } } 
            } 
          },
          shiftAttributes: {
            include: {
              assignments: {
                include: {
                  assignedUser: {
                    include: {
                      user: { select: { id: true, email: true } },
                      role: { select: { id: true, name: true } }
                    }
                  }
                }
              }
            }
          },
        },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      return {
        message: 'Shift retrieved successfully',
        data: shift,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve shift');
    }
  }

  async update(id: string, updateShiftDto: UpdateShiftDto) {
    try {
      const existingShift = await this.prisma.shift.findUnique({
        where: { id },
      });

      if (!existingShift) {
        throw new NotFoundException('Shift not found');
      }

      const updatedShift = await this.prisma.shift.update({
        where: { id },
        data: {
          ...(updateShiftDto.companyId && { companyId: updateShiftDto.companyId }),
          ...(updateShiftDto.shiftCreatedBy && { shiftCreatedBy: updateShiftDto.shiftCreatedBy }),
        },
        include: {
          company: { select: { id: true, name: true } },
          createdBy: { 
            include: { 
              user: { select: { id: true, email: true } } 
            } 
          },
          shiftAttributes: {
            include: {
              assignments: {
                include: {
                  assignedUser: {
                    include: {
                      user: { select: { id: true, email: true } }
                    }
                  }
                }
              }
            }
          },
        },
      });

      return {
        message: 'Shift updated successfully',
        data: updatedShift,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update shift');
    }
  }

  async remove(id: string) {
    try {
      const existingShift = await this.prisma.shift.findUnique({
        where: { id },
      });

      if (!existingShift) {
        throw new NotFoundException('Shift not found');
      }

      await this.prisma.shift.delete({
        where: { id },
      });

      return {
        message: 'Shift deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete shift');
    }
  }

 async assignShift(assignShiftDto: AssignShiftDto) {
  try {
    // Check if shift attribute exists
    const shiftAttribute = await this.prisma.shiftAttribute.findUnique({
      where: { id: assignShiftDto.shiftAttributeId },
      include: { 
        shift: true,
        assignments: {
          include: {
            assignedUser: true
          }
        }
      },
    });

    if (!shiftAttribute) {
      throw new NotFoundException('Shift attribute not found');
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      // Remove users if specified
      if (assignShiftDto.removeUserIds && assignShiftDto.removeUserIds.length > 0) {
        await prisma.shiftAttributeAssignment.deleteMany({
          where: {
            shiftAttributeId: assignShiftDto.shiftAttributeId,
            assignedUserId: { in: assignShiftDto.removeUserIds },
          },
        });
      }

      // Get existing assignments for this shift attribute
      const existingAssignments = await prisma.shiftAttributeAssignment.findMany({
        where: {
          shiftAttributeId: assignShiftDto.shiftAttributeId,
        },
        select: {
          assignedUserId: true,
        },
      });

      // Extract existing user IDs
      const existingUserIds = existingAssignments.map(assignment => assignment.assignedUserId);
      
      // Filter out users that are already assigned
      const newUserIdsToAssign = assignShiftDto.assignedUserIds.filter(
        userId => !existingUserIds.includes(userId)
      );

      console.log('Existing user IDs:', existingUserIds);
      console.log('New user IDs to assign:', newUserIdsToAssign);
      console.log('Removed user IDs:', assignShiftDto.removeUserIds);

      // Add new assignments (only for users not already assigned)
      const assignments: ShiftAttributeAssignment[] = [];
      for (const userId of newUserIdsToAssign) {
        // Check if user exists and belongs to the same company
        const user = await prisma.companyUser.findUnique({
          where: { id: userId },
        });

        if (user && user.companyId === shiftAttribute.shift.companyId) {
          try {
            const assignment = await prisma.shiftAttributeAssignment.create({
              data: {
                shiftAttributeId: assignShiftDto.shiftAttributeId,
                assignedUserId: userId,
              },
            });
            assignments.push(assignment);
          } catch (error) {
            // Ignore duplicate assignment errors (shouldn't happen with our filter, but just in case)
            if (error.code !== 'P2002') {
              throw error;
            }
          }
        }
      }

      return {
        assignmentsCreated: assignments,
        existingUsersSkipped: existingUserIds.length,
        newUsersAssigned: assignments.length,
      };
    });

    // Get updated shift attribute with assignments
    const updatedShiftAttribute = await this.prisma.shiftAttribute.findUnique({
      where: { id: assignShiftDto.shiftAttributeId },
      include: {
        shift: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
        assignments: {
          include: {
            assignedUser: {
              include: {
                user: { select: { id: true, email: true } },
                role: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return {
      message: 'Shift assignments updated successfully',
      data: updatedShiftAttribute,
      meta: {
        assignmentsCreated: result.newUsersAssigned,
        existingUsersSkipped: result.existingUsersSkipped,
        usersRemoved: assignShiftDto.removeUserIds ? assignShiftDto.removeUserIds.length : 0,
      }
    };
  } catch (error) {
    console.error('Error assigning shift:', error);
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException('Failed to assign shift');
  }
}

  async updateShiftAttribute(shiftAttributeId: string, updateData: any) {
    try {
      const existingAttribute = await this.prisma.shiftAttribute.findUnique({
        where: { id: shiftAttributeId },
      });

      if (!existingAttribute) {
        throw new NotFoundException('Shift attribute not found');
      }

      const updatedAttribute = await this.prisma.shiftAttribute.update({
        where: { id: shiftAttributeId },
        data: {
          ...(updateData.shiftName && { shiftName: updateData.shiftName }),
          ...(updateData.startTime && { startTime: new Date(updateData.startTime) }),
          ...(updateData.endTime && { endTime: new Date(updateData.endTime) }),
          ...(updateData.breakDuration !== undefined && { breakDuration: updateData.breakDuration }),
          ...(updateData.gracePeriodMinutes !== undefined && { gracePeriodMinutes: updateData.gracePeriodMinutes }),
          ...(updateData.description !== undefined && { description: updateData.description }),
          ...(updateData.color !== undefined && { color: updateData.color }),
          ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
        },
        include: {
          assignments: {
            include: {
              assignedUser: {
                include: {
                  user: { select: { id: true, email: true } },
                },
              },
            },
          },
        },
      });

      return {
        message: 'Shift attribute updated successfully',
        data: updatedAttribute,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update shift attribute');
    }
  }

  async deleteShiftAttribute(shiftAttributeId: string) {
    try {
      const existingAttribute = await this.prisma.shiftAttribute.findUnique({
        where: { id: shiftAttributeId },
      });

      if (!existingAttribute) {
        throw new NotFoundException('Shift attribute not found');
      }

      await this.prisma.shiftAttribute.delete({
        where: { id: shiftAttributeId },
      });

      return {
        message: 'Shift attribute deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete shift attribute');
    }
  }
}