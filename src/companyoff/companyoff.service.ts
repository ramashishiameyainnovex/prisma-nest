import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ConflictException 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyoffDto } from './dto/create-companyoff.dto';
import { UpdateCompanyoffDto } from './dto/update-companyoff.dto';
import { CreateOffdayDto } from './dto/create-offday.dto';
import { UpdateOffdayDto } from './dto/update-offday.dto';

@Injectable()
export class CompanyoffService {
  constructor(private prisma: PrismaService) {}

  // CompanyOff CRUD operations
 async create(createCompanyoffDto: CreateCompanyoffDto) {
  const { companyId, weekDay, description } = createCompanyoffDto;

  // Check if company exists
  const company = await this.prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new NotFoundException(`Company with ID ${companyId} not found`);
  }

  // Validate week days
  this.validateWeekDays(weekDay);

  // Check if CompanyOff already exists for this company
  const existingCompanyOff = await this.prisma.companyOff.findFirst({
    where: { companyId }
  });

  if (existingCompanyOff) {
    // CompanyOff exists, so update by pushing new week days to existing array
    // Remove duplicates and ensure unique values
    const updatedWeekDays = Array.from(new Set([...existingCompanyOff.weekDay, ...weekDay]));
    
    return this.prisma.companyOff.update({
      where: { id: existingCompanyOff.id },
      data: {
        weekDay: updatedWeekDays,
        description: description || existingCompanyOff.description
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        offDays: true
      }
    });
  } else {
    // CompanyOff doesn't exist, create new one
    return this.prisma.companyOff.create({
      data: {
        companyId,
        weekDay,
        description
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        offDays: true
      }
    });
  }
}


  async findAll(companyId?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const where = companyId ? { companyId } : {};

    const [companyOffs, total] = await Promise.all([
      this.prisma.companyOff.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          },
          offDays: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              },
              usersOffs: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.companyOff.count({ where })
    ]);

    return {
      data: companyOffs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string) {
    const companyOff = await this.prisma.companyOff.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        offDays: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            usersOffs: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!companyOff) {
      throw new NotFoundException(`CompanyOff with ID ${id} not found`);
    }

    return companyOff;
  }

  async update(id: string, updateCompanyoffDto: UpdateCompanyoffDto) {
    const { weekDay, ...rest } = updateCompanyoffDto;

    // Check if company off exists
    const existingCompanyOff = await this.prisma.companyOff.findUnique({
      where: { id }
    });

    if (!existingCompanyOff) {
      throw new NotFoundException(`CompanyOff with ID ${id} not found`);
    }

    // Validate week days if provided
    if (weekDay) {
      this.validateWeekDays(weekDay);
    }

    return this.prisma.companyOff.update({
      where: { id },
      data: {
        ...rest,
        ...(weekDay && { weekDay })
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        offDays: true
      }
    });
  }

  async remove(id: string) {
    // Check if company off exists
    const companyOff = await this.prisma.companyOff.findUnique({
      where: { id }
    });

    if (!companyOff) {
      throw new NotFoundException(`CompanyOff with ID ${id} not found`);
    }

    return this.prisma.companyOff.delete({
      where: { id }
    });
  }

  // OffDay CRUD operations
async createOffDay(createOffdayDto: CreateOffdayDto) {
  const { companyId, createdById, userIds, ...offDayData } = createOffdayDto;

  // Check if company exists
  const company = await this.prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new NotFoundException(`Company with ID ${companyId} not found`);
  }

  // Check if createdBy user exists and belongs to company
  const createdByUser = await this.prisma.companyUser.findFirst({
    where: {
      id: createdById,
      companyId
    }
  });

  if (!createdByUser) {
    throw new NotFoundException(`CompanyUser with ID ${createdById} not found in company`);
  }

  // Validate dates
  if (new Date(offDayData.fromDate) > new Date(offDayData.toDate)) {
    throw new BadRequestException('From date cannot be after to date');
  }

  return this.prisma.$transaction(async (tx) => {
    // First, find or create CompanyOff for this company
    let companyOff = await tx.companyOff.findFirst({
      where: { companyId }
    });

    // If CompanyOff doesn't exist, create it with default values
    if (!companyOff) {
      companyOff = await tx.companyOff.create({
        data: {
          companyId,
          weekDay: [], // Default empty week days
          description: 'Auto-created company off configuration'
        }
      });
    }

    // Create the off day and link it to the CompanyOff
    const offDay = await tx.offDay.create({
      data: {
        name: offDayData.name,
        holidayType: offDayData.holidayType,
        fromDate: new Date(offDayData.fromDate),
        toDate: new Date(offDayData.toDate),
        startTime: offDayData.startTime,
        endTime: offDayData.endTime,
        description: offDayData.description || '',
        companyId,
        createdById,
        companyOffId: companyOff.id // Link to the CompanyOff
      }
    });

    // Push userIds to usersOff if provided
    if (userIds && userIds.length > 0) {
      // Verify all users belong to the company
      const companyUsers = await tx.companyUser.findMany({
        where: {
          id: { in: userIds },
          companyId
        }
      });

      if (companyUsers.length !== userIds.length) {
        const foundUserIds = companyUsers.map(user => user.id);
        const missingUsers = userIds.filter(userId => !foundUserIds.includes(userId));
        throw new BadRequestException(`Some users do not belong to the company: ${missingUsers.join(', ')}`);
      }

      // Push each userId to usersOff table
      const usersOffData = userIds.map(userId => ({
        userId: userId,
        offDayId: offDay.id
      }));

      await tx.usersOff.createMany({
        data: usersOffData,
        skipDuplicates: true
      });
    }

    // Return the created off day with complete relations including usersOff
    return await tx.offDay.findUnique({
      where: { id: offDay.id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        usersOffs: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: {
                  select: {
                    email: true
                  }
                }
              }
            }
          }
        },
        companyOff: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  });
}

  async findOffDaysByCompany(companyId: string, fromDate?: string, toDate?: string) {
    const where: any = { companyId };

    if (fromDate || toDate) {
      where.OR = [];
      
      if (fromDate && toDate) {
        // Find off days that overlap with the date range
        where.OR.push({
          AND: [
            { fromDate: { lte: new Date(toDate) } },
            { toDate: { gte: new Date(fromDate) } }
          ]
        });
      } else if (fromDate) {
        where.OR.push({ toDate: { gte: new Date(fromDate) } });
      } else if (toDate) {
        where.OR.push({ fromDate: { lte: new Date(toDate) } });
      }
    }

    return this.prisma.offDay.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        usersOffs: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { fromDate: 'asc' }
    });
  }

  async findOffDaysByUser(userId: string, fromDate?: string, toDate?: string) {
    const where: any = {
      usersOffs: {
        some: { userId }
      }
    };

    if (fromDate || toDate) {
      where.OR = [];
      
      if (fromDate && toDate) {
        where.OR.push({
          AND: [
            { fromDate: { lte: new Date(toDate) } },
            { toDate: { gte: new Date(fromDate) } }
          ]
        });
      } else if (fromDate) {
        where.OR.push({ toDate: { gte: new Date(fromDate) } });
      } else if (toDate) {
        where.OR.push({ fromDate: { lte: new Date(toDate) } });
      }
    }

    return this.prisma.offDay.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { fromDate: 'asc' }
    });
  }

  async findOffDayById(id: string) {
    const offDay = await this.prisma.offDay.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        usersOffs: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: {
                  select: {
                    email: true
                  }
                }
              }
            }
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        },
        companyOff: true
      }
    });

    if (!offDay) {
      throw new NotFoundException(`OffDay with ID ${id} not found`);
    }

    return offDay;
  }

  async updateOffDay(id: string, updateOffdayDto: UpdateOffdayDto) {
    const { userIds, ...offDayData } = updateOffdayDto;

    // Check if off day exists
    const existingOffDay = await this.prisma.offDay.findUnique({
      where: { id }
    });

    if (!existingOffDay) {
      throw new NotFoundException(`OffDay with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Update the off day
      const updatedOffDay = await tx.offDay.update({
        where: { id },
        data: {
          ...offDayData,
          ...(offDayData.fromDate && { fromDate: new Date(offDayData.fromDate) }),
          ...(offDayData.toDate && { toDate: new Date(offDayData.toDate) })
        }
      });

      // Update user assignments if provided
      if (userIds) {
        // Remove existing assignments
        await tx.usersOff.deleteMany({
          where: { offDayId: id }
        });

        // Create new assignments if userIds array is not empty
        if (userIds.length > 0) {
          await tx.usersOff.createMany({
            data: userIds.map(userId => ({
              userId,
              offDayId: id
            }))
          });
        }
      }

      return this.findOffDayById(id);
    });
  }

  async removeOffDay(id: string) {
    // Check if off day exists
    const offDay = await this.prisma.offDay.findUnique({
      where: { id }
    });

    if (!offDay) {
      throw new NotFoundException(`OffDay with ID ${id} not found`);
    }

    return this.prisma.offDay.delete({
      where: { id }
    });
  }

  // Utility methods
  async getCompanyWeekOff(companyId: string) {
    const companyOff = await this.prisma.companyOff.findFirst({
      where: { companyId }
    });

    if (!companyOff) {
      throw new NotFoundException('Company off configuration not found');
    }

    return {
      weekDays: companyOff.weekDay,
      description: companyOff.description
    };
  }

  async getUpcomingOffDaysForUser(userId: string, days: number = 30) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.prisma.offDay.findMany({
      where: {
        usersOffs: {
          some: { userId }
        },
        fromDate: {
          lte: endDate
        },
        toDate: {
          gte: startDate
        }
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { fromDate: 'asc' }
    });
  }

  // Helper method to validate week days
  private validateWeekDays(weekDay: number[]) {
    const validDays = [0, 1, 2, 3, 4, 5, 6]; // 0=Sunday, 6=Saturday
    
    const invalidDays = weekDay.filter(day => !validDays.includes(day));
    
    if (invalidDays.length > 0) {
      throw new BadRequestException(`Invalid week days: ${invalidDays.join(', ')}. Valid days are 0-6 (0=Sunday, 6=Saturday)`);
    }

    // Check for duplicates
    const uniqueDays = new Set(weekDay);
    if (uniqueDays.size !== weekDay.length) {
      throw new BadRequestException('Duplicate week days are not allowed');
    }
  }
}