import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { AttendanceStatus, PunchType } from '@prisma/client';
import moment from 'moment';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) { }

  async create(createAttendanceDto: CreateAttendanceDto) {
    try {
      // Check if company exists
      const company = await this.prisma.company.findUnique({
        where: { id: createAttendanceDto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: createAttendanceDto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if company user exists and belongs to the same company
      if (createAttendanceDto.companyUserId) {
        const companyUser = await this.prisma.companyUser.findUnique({
          where: { id: createAttendanceDto.companyUserId },
        });

        if (!companyUser) {
          throw new NotFoundException('Company user not found');
        }

        if (companyUser.companyId !== createAttendanceDto.companyId || companyUser.userId !== createAttendanceDto.userId) {
          throw new BadRequestException('Company user does not match the specified company and user');
        }
      }

      const punchDate = new Date(createAttendanceDto.punchDate);
      const dateOnly = new Date(punchDate.getFullYear(), punchDate.getMonth(), punchDate.getDate());

      // Handle PUNCH OUT with existing userPunchId and attendanceId
      if (createAttendanceDto.punchType === PunchType.OUT && createAttendanceDto.userPunchId && createAttendanceDto.attendanceId) {
        return await this.handlePunchOutUpdate(createAttendanceDto);
      }

      // Handle PUNCH IN or PUNCH OUT without specific IDs (create new)
      return await this.handleNewPunch(createAttendanceDto, dateOnly);
    } catch (error) {
      console.error('Error creating attendance:', error);
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create attendance');
    }
  }

private async handlePunchOutUpdate(createAttendanceDto: CreateAttendanceDto) {
  const result = await this.prisma.$transaction(async (prisma) => {
    // Verify the user punch exists and belongs to the correct user/attendance
    const existingUserPunch = await prisma.userPunch.findFirst({
      where: {
        id: createAttendanceDto.userPunchId,
        attendanceId: createAttendanceDto.attendanceId,
        attendance: {
          userId: createAttendanceDto.userId,
          companyId: createAttendanceDto.companyId,
        },
      },
      include: {
        attendance: true,
      },
    });

    if (!existingUserPunch) {
      throw new NotFoundException('User punch record not found or does not match the provided details');
    }

    // Verify it's a punch in record that needs punch out
    if (existingUserPunch.punchType !== PunchType.IN) {
      throw new BadRequestException('Cannot punch out on a non-punch in record');
    }

    if (existingUserPunch.punchOut) {
      throw new BadRequestException('This punch in record already has a punch out time');
    }

    // Calculate work hours and overtime
    if (!createAttendanceDto.punchOut) {
      throw new BadRequestException('Punch out time is required');
    }

    const punchOutTime = new Date(createAttendanceDto.punchOut);
    const punchInTime = new Date(existingUserPunch.punchIn);

    // Use companyUserId for shift calculation, fallback to finding companyUserId if not provided
    let companyUserId = createAttendanceDto.companyUserId;
    if (!companyUserId) {
      const companyUser = await prisma.companyUser.findFirst({
        where: {
          userId: createAttendanceDto.userId,
          companyId: createAttendanceDto.companyId
        }
      });
      companyUserId = companyUser?.id;
    }

    const { workedHours, overtime } = await this.calculateWorkedAndOvertime(
      punchInTime, 
      punchOutTime, 
      companyUserId
    );

    // Update the existing punch in record with punch out details
    await prisma.userPunch.update({
      where: { id: createAttendanceDto.userPunchId },
      data: {
        punchOut: punchOutTime,
        punchOutLocation: createAttendanceDto.punchOutLocation,
        workHours: workedHours,
        overtime: overtime,
        punchType: PunchType.OUT,
        remarks: createAttendanceDto.remarks || existingUserPunch.remarks,
        deviceId: createAttendanceDto.deviceId || existingUserPunch.deviceId,
        ipAddress: createAttendanceDto.ipAddress || existingUserPunch.ipAddress,
      },
    });

    // Update total work hours for the day
    if (!createAttendanceDto.attendanceId) {
      throw new BadRequestException('Attendance ID is required to update daily work hours');
    }
    await this.updateDailyWorkHours(createAttendanceDto.attendanceId);

    return prisma.attendance.findUnique({
      where: { id: createAttendanceDto.attendanceId },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
        companyUser: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
        userPunches: {
          orderBy: { punchIn: 'asc' },
        },
      },
    });
  });

  return {
    message: 'Punch out recorded successfully',
    data: result,
  };
}

  private async handleNewPunch(createAttendanceDto: CreateAttendanceDto, dateOnly: Date) {
    // Check if attendance already exists for this user on this date
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        companyId: createAttendanceDto.companyId,
        userId: createAttendanceDto.userId,
        punchDate: dateOnly,
      },
      include: {
        userPunches: {
          orderBy: { punchIn: 'desc' },
        },
      },
    });

    if (existingAttendance && createAttendanceDto.punchType === PunchType.IN) {
      // Check if user is already punched in
      const existingOpenPunch = existingAttendance.userPunches.find(
        punch => punch.punchType === PunchType.IN && !punch.punchOut
      );

      if (existingOpenPunch) {
        throw new ConflictException('User is already punched in. Please punch out first.');
      }
    }

    if (existingAttendance && createAttendanceDto.punchType === PunchType.OUT) {
      // Find the last punch in without punch out
      const lastPunchIn = existingAttendance.userPunches.find(
        punch => punch.punchType === PunchType.IN && !punch.punchOut
      );

      if (!lastPunchIn) {
        throw new BadRequestException('No active punch in found. Please punch in first.');
      }

      // Use the existing punch in record for punch out
      createAttendanceDto.userPunchId = lastPunchIn.id;
      createAttendanceDto.attendanceId = existingAttendance.id;
      return await this.handlePunchOutUpdate(createAttendanceDto);
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      let attendance: any = existingAttendance;

      // If no attendance exists, create one
      if (!attendance) {
        attendance = await prisma.attendance.create({
          data: {
            companyId: createAttendanceDto.companyId,
            userId: createAttendanceDto.userId,
            companyUserId: createAttendanceDto.companyUserId,
            punchDate: dateOnly,
            finalStatus: AttendanceStatus.PRESENT,
            totalWorkHours: 0,
            totalOvertime: 0,
          },
        });
      }

      if (createAttendanceDto.punchType === PunchType.IN) {
        // Create new punch in record
        if (!createAttendanceDto.punchIn) {
          throw new BadRequestException('Punch in time is required');
        }
        await prisma.userPunch.create({
          data: {
            attendanceId: attendance.id,
            punchIn: new Date(createAttendanceDto.punchIn),
            punchInLocation: createAttendanceDto.punchInLocation,
            punchType: PunchType.IN,
            status: AttendanceStatus.PRESENT,
            deviceId: createAttendanceDto.deviceId,
            ipAddress: createAttendanceDto.ipAddress,
            remarks: createAttendanceDto.remarks,
          },
        });
      }

      return prisma.attendance.findUnique({
        where: { id: attendance.id },
        include: {
          company: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
          companyUser: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
          userPunches: {
            orderBy: { punchIn: 'asc' },
          },
        },
      });
    });

    const message = createAttendanceDto.punchType === PunchType.IN
      ? 'Punch in recorded successfully'
      : 'Punch out recorded successfully';

    return {
      message,
      data: result,
    };
  }

  
  private async calculateWorkingHours(userId?: string) {
    const userShift = await this.prisma.shiftAttributeAssignment.findMany({
      where: {
        assignedUserId: userId, // This should be a CompanyUser ID
      },
      include: {
        shiftAttribute: {
          include: {
            shift: true
          }
        }
      }
    });

    if (!userShift || userShift.length === 0) {
      throw new Error('No shift assignments found for this user');
    }

    // Calculate working hours for each shift assignment
    const workingHours = userShift.map(assignment => {
      const shiftAttribute = assignment.shiftAttribute;

      // Calculate working hours using moment.js
      const startTime = moment(shiftAttribute.startTime);
      const endTime = moment(shiftAttribute.endTime);

      // Calculate total working hours in hours
      const totalWorkingHours = endTime.diff(startTime, 'hours', true);

      // Subtract break duration if exists
      const breakHours = shiftAttribute.breakDuration ? shiftAttribute.breakDuration / 60 : 0;
      const netWorkingHours = totalWorkingHours - breakHours;

      console.log("new working hours", netWorkingHours);
      return netWorkingHours;
    });

    return workingHours;
  }
private async updateDailyWorkHours(attendanceId: string) {
  const attendance = await this.prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      userPunches: {
        where: {
          punchOut: { not: null }
        }
      }
    }
  });

  if (!attendance) return;

  // Calculate total work hours and overtime for the day
  const dailyTotals = attendance.userPunches.reduce((totals, punch) => {
    return {
      totalWorkHours: totals.totalWorkHours + (punch.workHours || 0),
      totalOvertime: totals.totalOvertime + (punch.overtime || 0)
    };
  }, { totalWorkHours: 0, totalOvertime: 0 });

  // Update attendance with daily totals
  await this.prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      totalWorkHours: Math.round(dailyTotals.totalWorkHours * 100) / 100,
      totalOvertime: Math.round(dailyTotals.totalOvertime * 100) / 100
    }
  });
}
  private async calculateWorkedAndOvertime(
  punchInTime: Date, 
  punchOutTime: Date, 
  userId?: string
): Promise<{ workedHours: number; overtime: number }> {
  // Calculate actual worked hours
  const actualWorkedHours = (punchOutTime.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);
  const roundedWorkedHours = Math.round(actualWorkedHours * 100) / 100;

  // If no userId provided, return only worked hours without overtime calculation
  if (!userId) {
    return {
      workedHours: roundedWorkedHours,
      overtime: 0
    };
  }

  try {
    // Get user's scheduled shift hours
    const userShift = await this.prisma.shiftAttributeAssignment.findFirst({
      where: {
        assignedUserId: userId,
      },
      include: {
        shiftAttribute: true
      },
      orderBy: {
        assignedAt: 'desc'
      }
    });

    // If no shift found, return only worked hours
    if (!userShift) {
      return {
        workedHours: roundedWorkedHours,
        overtime: 0
      };
    }

    const shiftAttribute = userShift.shiftAttribute;
    
    // Calculate scheduled working hours
    const shiftStartTime = moment(shiftAttribute.startTime);
    const shiftEndTime = moment(shiftAttribute.endTime);
    const scheduledHours = shiftEndTime.diff(shiftStartTime, 'hours', true);
    
    // Subtract break duration if exists
    const breakHours = shiftAttribute.breakDuration ? shiftAttribute.breakDuration / 60 : 0;
    const netScheduledHours = scheduledHours - breakHours;

    // Calculate overtime (worked hours beyond scheduled hours)
    const overtime = Math.max(0, roundedWorkedHours - netScheduledHours);
    const roundedOvertime = Math.round(overtime * 100) / 100;

    console.log("Scheduled hours:", netScheduledHours, "Worked hours:", roundedWorkedHours, "Overtime:", roundedOvertime);

    return {
      workedHours: roundedWorkedHours,
      overtime: roundedOvertime
    };
  } catch (error) {
    console.error('Error calculating overtime:', error);
    // If error in overtime calculation, return only worked hours
    return {
      workedHours: roundedWorkedHours,
      overtime: 0
    };
  }
}
  async findAll(filterAttendanceDto: FilterAttendanceDto) {
    try {
      const where: any = {};

      if (filterAttendanceDto.companyId) {
        where.companyId = filterAttendanceDto.companyId;
      }

      if (filterAttendanceDto.userId) {
        where.userId = filterAttendanceDto.userId;
      }

      if (filterAttendanceDto.companyUserId) {
        where.companyUserId = filterAttendanceDto.companyUserId;
      }

      if (filterAttendanceDto.startDate || filterAttendanceDto.endDate) {
        where.punchDate = {
          ...(filterAttendanceDto.startDate && { gte: new Date(filterAttendanceDto.startDate) }),
          ...(filterAttendanceDto.endDate && { lte: new Date(filterAttendanceDto.endDate) }),
        };
      }

      if (filterAttendanceDto.finalStatus) {
        where.finalStatus = filterAttendanceDto.finalStatus;
      }

      if (filterAttendanceDto.userName) {
        where.user = {
          email: {
            contains: filterAttendanceDto.userName,
            mode: 'insensitive',
          },
        };
      }

      const attendances = await this.prisma.attendance.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
          companyUser: {
            include: {
              user: { select: { id: true, email: true } },
              role: { select: { id: true, name: true } },
            },
          },
          userPunches: {
            orderBy: { punchIn: 'asc' },
          },
        },
        orderBy: { punchDate: 'desc' },
      });

      return {
        message: 'Attendances retrieved successfully',
        data: attendances,
      };
    } catch (error) {
      console.error('Error retrieving attendances:', error);
      throw new InternalServerErrorException('Failed to retrieve attendances');
    }
  }

  async findOne(id: string) {
    try {
      const attendance = await this.prisma.attendance.findUnique({
        where: { id },
        include: {
          company: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
          companyUser: {
            include: {
              user: { select: { id: true, email: true } },
              role: { select: { id: true, name: true } },
            },
          },
          userPunches: {
            orderBy: { punchIn: 'asc' },
          },
        },
      });

      if (!attendance) {
        throw new NotFoundException('Attendance not found');
      }

      return {
        message: 'Attendance retrieved successfully',
        data: attendance,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve attendance');
    }
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    try {
      const existingAttendance = await this.prisma.attendance.findUnique({
        where: { id },
      });

      if (!existingAttendance) {
        throw new NotFoundException('Attendance not found');
      }

      const updatedAttendance = await this.prisma.attendance.update({
        where: { id },
        data: {
          ...(updateAttendanceDto.companyId && { companyId: updateAttendanceDto.companyId }),
          ...(updateAttendanceDto.userId && { userId: updateAttendanceDto.userId }),
          ...(updateAttendanceDto.companyUserId !== undefined && { companyUserId: updateAttendanceDto.companyUserId }),
          ...(updateAttendanceDto.punchDate && { punchDate: new Date(updateAttendanceDto.punchDate) }),
          ...(Object.prototype.hasOwnProperty.call(updateAttendanceDto, 'totalWorkHours') && { totalWorkHours: (updateAttendanceDto as any).totalWorkHours }),
          ...(Object.prototype.hasOwnProperty.call(updateAttendanceDto, 'totalOvertime') && { totalOvertime: (updateAttendanceDto as any).totalOvertime }),
        },
        include: {
          company: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
          companyUser: {
            include: {
              user: { select: { id: true, email: true } },
            },
          },
          userPunches: {
            orderBy: { punchIn: 'asc' },
          },
        },
      });

      return {
        message: 'Attendance updated successfully',
        data: updatedAttendance,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update attendance');
    }
  }

  async remove(id: string) {
    try {
      const existingAttendance = await this.prisma.attendance.findUnique({
        where: { id },
      });

      if (!existingAttendance) {
        throw new NotFoundException('Attendance not found');
      }

      await this.prisma.attendance.delete({
        where: { id },
      });

      return {
        message: 'Attendance deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete attendance');
    }
  }

  async getUserCurrentStatus(userId: string, companyId: string) {
    try {
      const today = new Date();
      const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const attendance = await this.prisma.attendance.findFirst({
        where: {
          companyId,
          userId,
          punchDate: dateOnly,
        },
        include: {
          userPunches: {
            orderBy: { punchIn: 'desc' },
          },
          user: { select: { id: true, email: true } },
          company: { select: { id: true, name: true } },
        },
      });

      if (!attendance) {
        return {
          message: 'User attendance status retrieved successfully',
          data: {
            isPunchedIn: false,
            currentStatus: 'OUT',
            lastPunch: null,
            todayPunches: [],
            message: 'No attendance record for today'
          }
        };
      }

      const lastPunchIn = attendance.userPunches.find(punch => punch.punchType === PunchType.IN && !punch.punchOut);
      const isPunchedIn = !!lastPunchIn;

      return {
        message: 'User attendance status retrieved successfully',
        data: {
          isPunchedIn,
          currentStatus: isPunchedIn ? 'IN' : 'OUT',
          lastPunch: lastPunchIn || attendance.userPunches[0],
          todayPunches: attendance.userPunches,
          attendanceId: attendance.id,
          user: attendance.user,
          company: attendance.company,
          punchDate: attendance.punchDate
        }
      };
    } catch (error) {
      console.error('Error retrieving user current status:', error);
      throw new InternalServerErrorException('Failed to retrieve user current status');
    }
  }

  async getUserAttendanceSummary(userId: string, companyId: string, startDate: string, endDate: string) {
    try {
      const attendances = await this.prisma.attendance.findMany({
        where: {
          userId,
          companyId,
          punchDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          userPunches: true,
        },
      });

      const summary = {
        totalDays: attendances.length,
        presentDays: attendances.filter(a => a.finalStatus === AttendanceStatus.PRESENT).length,
        absentDays: attendances.filter(a => a.finalStatus === AttendanceStatus.ABSENT).length,
        leaveDays: attendances.filter(a => a.finalStatus === AttendanceStatus.ON_LEAVE).length,
        halfDays: attendances.filter(a => a.finalStatus === AttendanceStatus.HALF_DAY).length,
        totalWorkHours: attendances.reduce((sum, a) => sum + (a.totalWorkHours || 0), 0),
        totalOvertime: attendances.reduce((sum, a) => sum + (a.totalOvertime || 0), 0),
        averageWorkHours: attendances.length > 0 ?
          attendances.reduce((sum, a) => sum + (a.totalWorkHours || 0), 0) / attendances.length : 0,
      };

      return {
        message: 'Attendance summary retrieved successfully',
        data: summary,
      };
    } catch (error) {
      console.error('Error retrieving attendance summary:', error);
      throw new InternalServerErrorException('Failed to retrieve attendance summary');
    }
  }
}