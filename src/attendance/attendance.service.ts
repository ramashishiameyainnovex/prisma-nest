import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/create-attendance.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) { }


  async PunchIn(createAttendanceDto: CreateAttendanceDto) {
    try {
      // Validate required fields
      if (!createAttendanceDto.companyId || !createAttendanceDto.userId) {
        throw new BadRequestException('Company ID and User ID are required');
      }

      // Check user shift
      const shiftCheck = await this.checkUserShift(createAttendanceDto.companyUserId, createAttendanceDto.companyId);
      if (!shiftCheck.isInShift) {
        throw new BadRequestException(`Cannot punch in: ${shiftCheck.message}`);
      }

      const punchInTime = createAttendanceDto.punchIn ? new Date(createAttendanceDto.punchIn) : new Date();
      const punchDate = new Date(punchInTime.toISOString().split('T')[0]);

      // Find or create attendance record for the day
      let attendance = await this.prisma.attendance.findFirst({
        where: {
          companyId: createAttendanceDto.companyId,
          userId: createAttendanceDto.userId,
          punchDate: punchDate,
        },
      });

      // If no attendance record exists for today, create one
      if (!attendance) {
        attendance = await this.prisma.attendance.create({
          data: {
            companyId: createAttendanceDto.companyId,
            userId: createAttendanceDto.userId,
            companyUserId: createAttendanceDto.companyUserId,
            punchDate: punchDate,
            finalStatus: 'PRESENT',
          },
        });
      }

      // Check if user already has an active punch-in
      const activePunch = await this.prisma.userPunch.findFirst({
        where: {
          attendanceId: attendance.id,
          punchOut: null,
        },
      });

      if (activePunch) {
        throw new BadRequestException('You already have an active punch-in. Please punch out first.');
      }

      // Convert location object to JSON string
      const punchInLocationJson = createAttendanceDto.punchInLocation
        ? JSON.stringify(createAttendanceDto.punchInLocation)
        : null;

      // Create user punch record
      const userPunch = await this.prisma.userPunch.create({
        data: {
          attendanceId: attendance.id,
          punchIn: punchInTime,
          punchInLocation: punchInLocationJson as any,
          punchType: 'IN',
          status: createAttendanceDto.status || 'PRESENT',
          deviceId: createAttendanceDto.deviceId,
          ipAddress: createAttendanceDto.ipAddress,
          remarks: createAttendanceDto.remarks,
        },
      });

      return {
        attendance,
        userPunch: {
          ...userPunch,
          punchInLocation: createAttendanceDto.punchInLocation, // Return as object
        },
        message: 'Punch In successful!'
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async PunchOut(createAttendanceDto: CreateAttendanceDto) {
    try {
      // Validate required fields
      if (!createAttendanceDto.companyId || !createAttendanceDto.userId) {
        throw new BadRequestException('Company ID and User ID are required');
      }

      const punchOutTime = createAttendanceDto.punchOut ? new Date(createAttendanceDto.punchOut) : new Date();
      const punchDate = new Date(punchOutTime.toISOString().split('T')[0]);

      // Find today's attendance record
      const attendance = await this.prisma.attendance.findFirst({
        where: {
          companyId: createAttendanceDto.companyId,
          companyUserId: createAttendanceDto.companyUserId,
          punchDate: punchDate,
        },
        include: {
          userPunches: {
            where: {
              punchOut: null,
            },
            orderBy: { punchIn: 'desc' }
          }
        }
      });
      console.log('Attendance fetched for Punch Out:', attendance, punchDate);
      if (!attendance || attendance.userPunches.length === 0) {
        throw new NotFoundException('No active punch-in found for this user today!');
      }

      const activePunch = attendance.userPunches[0];
      const punchInTime = activePunch.punchIn;

      // Calculate work hours
      const diffMs = punchOutTime.getTime() - punchInTime.getTime();
      const totalHours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;

      // Check user status for overtime calculation
      const userStatus = await this.checkUserStatus(createAttendanceDto.companyId, createAttendanceDto.userId);

      // Calculate work hours and overtime
      const { workHours, overtime } = this.calculateWorkHours(totalHours, userStatus);

      // Convert location object to JSON string
      const punchOutLocationJson = createAttendanceDto.punchOutLocation
        ? JSON.stringify(createAttendanceDto.punchOutLocation)
        : null;

      // Update the user punch record
      const updatedPunch = await this.prisma.userPunch.update({
        where: { id: activePunch.id },
        data: {
          punchOut: punchOutTime,
          punchOutLocation: punchOutLocationJson as any,
          workHours: workHours,
          overtime: overtime,
          punchType: 'OUT',
          status: createAttendanceDto.status || activePunch.status,
          remarks: createAttendanceDto.remarks || activePunch.remarks,
          updatedAt: new Date(),
        }
      });

      // Recalculate totals for all punches today
      await this.recalculateAttendanceTotals(attendance.id);

      // Get updated attendance with all punches
      const updatedAttendance: any = await this.prisma.attendance.findUnique({
        where: { id: attendance.id },
        include: {
          userPunches: {
            orderBy: { punchIn: 'asc' }
          },
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
            }
          }
        }
      });

      // Parse location JSON back to objects for response
      const punchesWithParsedLocations = updatedAttendance.userPunches.map((punch: any) => ({
        ...punch,
        punchInLocation: punch.punchInLocation ? JSON.parse(punch.punchInLocation as string) : null,
        punchOutLocation: punch.punchOutLocation ? JSON.parse(punch.punchOutLocation as string) : null,
      }));

      return {
        attendance: {
          ...updatedAttendance,
          userPunches: punchesWithParsedLocations,
        },
        userStatus: userStatus,
        currentPunch: {
          ...updatedPunch,
          punchInLocation: updatedPunch.punchInLocation ? JSON.parse(updatedPunch.punchInLocation as string) : null,
          punchOutLocation: updatedPunch.punchOutLocation ? JSON.parse(updatedPunch.punchOutLocation as string) : null,
        },
        message: 'Punch Out successful!'
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(filter: {
    companyId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    try {
      const { companyId, userId, startDate, endDate, page = 1, limit = 10 } = filter;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (companyId) where.companyId = companyId;
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.punchDate = {};
        if (startDate) where.punchDate.gte = startDate;
        if (endDate) where.punchDate.lte = endDate;
      }

      const [attendances, total] = await Promise.all([
        this.prisma.attendance.findMany({
          where,
          include: {
            userPunches: {
              orderBy: { punchIn: 'asc' }
            },
            user: {
              select: {
                email: true,
              }
            },
            companyUser: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          },
          orderBy: { punchDate: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.attendance.count({ where })
      ]);

      // Parse location JSON for all punches
      const attendancesWithParsedLocations = attendances.map(attendance => ({
        ...attendance,
        userPunches: attendance.userPunches.map(punch => ({
          ...punch,
          punchInLocation: punch.punchInLocation ? JSON.parse(punch.punchInLocation as string) : null,
          punchOutLocation: punch.punchOutLocation ? JSON.parse(punch.punchOutLocation as string) : null,
        })),
      }));

      return {
        attendances: attendancesWithParsedLocations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findUserAttendance(filter: {
    companyId: string;
    userId: string;
    date?: Date;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const { companyId, userId, date, startDate, endDate } = filter;

      const where: any = {
        companyId,
        userId,
      };

      if (date) {
        where.punchDate = date;
      } else if (startDate && endDate) {
        where.punchDate = {
          gte: startDate,
          lte: endDate,
        };
      }

      const attendances = await this.prisma.attendance.findMany({
        where,
        include: {
          userPunches: {
            orderBy: { punchIn: 'asc' }
          },
        },
        orderBy: { punchDate: 'desc' },
      });

      // Parse location JSON for all punches
      const attendancesWithParsedLocations = attendances.map(attendance => ({
        ...attendance,
        userPunches: attendance.userPunches.map(punch => ({
          ...punch,
          punchInLocation: punch.punchInLocation ? JSON.parse(punch.punchInLocation as string) : null,
          punchOutLocation: punch.punchOutLocation ? JSON.parse(punch.punchOutLocation as string) : null,
        })),
      }));

      return attendancesWithParsedLocations;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findOne(id: string) {
    try {
      const attendance = await this.prisma.attendance.findUnique({
        where: { id },
        include: {
          userPunches: {
            orderBy: { punchIn: 'asc' }
          },
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
            }
          },
          company: {
            select: {
              id: true,
              name: true,
            }
          }
        },
      });

      if (!attendance) {
        throw new NotFoundException(`Attendance record with ID ${id} not found`);
      }

      // Parse location JSON for all punches
      const attendanceWithParsedLocations = {
        ...attendance,
        userPunches: attendance.userPunches.map(punch => ({
          ...punch,
          punchInLocation: punch.punchInLocation ? JSON.parse(punch.punchInLocation as string) : null,
          punchOutLocation: punch.punchOutLocation ? JSON.parse(punch.punchOutLocation as string) : null,
        })),
      };

      return attendanceWithParsedLocations;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    try {
      const existingAttendance = await this.prisma.attendance.findUnique({
        where: { id },
      });

      if (!existingAttendance) {
        throw new NotFoundException(`Attendance record with ID ${id} not found`);
      }

      const updatedAttendance = await this.prisma.attendance.update({
        where: { id },
        data: {
          finalStatus: updateAttendanceDto.status as any,
          totalWorkHours: updateAttendanceDto.workHours,
          totalOvertime: updateAttendanceDto.overtime,
        },
        include: {
          userPunches: true,
        }
      });

      return updatedAttendance;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: string) {
    try {
      const existingAttendance = await this.prisma.attendance.findUnique({
        where: { id },
      });

      if (!existingAttendance) {
        throw new NotFoundException(`Attendance record with ID ${id} not found`);
      }

      await this.prisma.userPunch.deleteMany({
        where: { attendanceId: id },
      });

      await this.prisma.attendance.delete({
        where: { id },
      });

      return { message: 'Attendance record deleted successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getUserAttendanceSummary(userId: string, companyId: string, month?: string) {
    try {
      const startDate = month ?
        new Date(`${month}-01`) :
        new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      const endDate = month ?
        new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0) :
        new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

      const attendances = await this.prisma.attendance.findMany({
        where: {
          userId,
          companyId,
          punchDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          userPunches: true,
        },
      });

      const totalWorkHours = attendances.reduce((sum, attendance) =>
        sum + (attendance.totalWorkHours || 0), 0
      );
      const totalOvertime = attendances.reduce((sum, attendance) =>
        sum + (attendance.totalOvertime || 0), 0
      );
      const presentDays = attendances.filter(a =>
        a.finalStatus === 'PRESENT' || a.finalStatus === 'LATE' || a.finalStatus === 'HALF_DAY'
      ).length;

      return {
        userId,
        companyId,
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        totalWorkDays: attendances.length,
        presentDays,
        absentDays: attendances.filter(a => a.finalStatus === 'ABSENT').length,
        totalWorkHours,
        totalOvertime,
        attendances: attendances.map(a => ({
          date: a.punchDate,
          status: a.finalStatus,
          workHours: a.totalWorkHours,
          overtime: a.totalOvertime,
          punches: a.userPunches.length,
        })),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Helper Methods
  private calculateWorkHours(totalHours: number, userStatus: any) {
    if (!userStatus.canPunch) {
      return {
        workHours: 0,
        overtime: totalHours
      };
    }

    const standardWorkHours = 8;
    const workHours = Math.min(totalHours, standardWorkHours);
    const overtime = Math.max(0, totalHours - standardWorkHours);

    return {
      workHours,
      overtime
    };
  }

  private async recalculateAttendanceTotals(attendanceId: string) {
    const allPunches = await this.prisma.userPunch.findMany({
      where: { attendanceId }
    });

    const totalWorkHours = allPunches.reduce((sum, punch) => sum + (punch.workHours || 0), 0);
    const totalOvertime = allPunches.reduce((sum, punch) => sum + (punch.overtime || 0), 0);

    let finalStatus = 'PRESENT';
    if (allPunches.length === 0) {
      finalStatus = 'ABSENT';
    } else if (allPunches.some(punch => punch.status === 'HALF_DAY')) {
      finalStatus = 'HALF_DAY';
    } else if (allPunches.some(punch => punch.status === 'LATE')) {
      finalStatus = 'LATE';
    }

    await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        totalWorkHours,
        totalOvertime,
        finalStatus: finalStatus as any,
      },
    });
  }

  async checkUserStatus(companyId: string, userId: string) {
    const currentDate = new Date();

    // Check if user is on leave
    const userLeave = await this.prisma.leave.findFirst({
      where: {
        userId: userId,
        startDate: { lte: currentDate },
        endDate: { gte: currentDate },
        status: 'APPROVED',
        companyId: companyId,
      },
    });

    if (userLeave) {
      return {
        canPunch: false,
        reason: 'ON_LEAVE',
        message: 'User is currently on approved leave',
        leaveDetails: userLeave
      };
    }

    // Check for company-wide off days
    const companyOffDay = await this.prisma.offDay.findFirst({
      where: {
        companyId: companyId,
        fromDate: { lte: currentDate },
        toDate: { gte: currentDate },
      },
    });

    if (companyOffDay) {
      return {
        canPunch: false,
        reason: 'COMPANY_OFF_DAY',
        message: 'Today is a company off day',
        offDayDetails: companyOffDay
      };
    }

    // Check for user-specific off days (UsersOff)
    const userSpecificOffDay = await this.prisma.usersOff.findFirst({
      where: {
        userId: userId,
        offDay: {
          fromDate: { lte: currentDate },
          toDate: { gte: currentDate },
          companyId: companyId,
        }
      },
      include: {
        offDay: true
      }
    });

    if (userSpecificOffDay) {
      return {
        canPunch: false,
        reason: 'USER_SPECIFIC_OFF_DAY',
        message: 'User has a scheduled off day',
        offDayDetails: userSpecificOffDay.offDay
      };
    }

    // Check for recurring weekly off days (CompanyOff)
    const currentDayOfWeek = currentDate.getDay();
    const weeklyCompanyOff = await this.prisma.companyOff.findFirst({
      where: {
        companyId: companyId,
        weekDay: {
          has: currentDayOfWeek
        }
      },
    });

    if (weeklyCompanyOff) {
      return {
        canPunch: false,
        reason: 'WEEKLY_COMPANY_OFF',
        message: 'Today is a weekly company off day',
        companyOffDetails: weeklyCompanyOff
      };
    }

    return {
      canPunch: true,
      reason: 'ELIGIBLE_FOR_PUNCH',
      message: 'User is eligible to punch in'
    };
  }

  async checkUserShift(companyUserId: string, companyId: string): Promise<{ isInShift: boolean; message: string; shiftDetails?: any }> {
    try {
      const userShift = await this.prisma.shiftAttributeAssignment.findFirst({
        where: {
          assignedUserId: companyUserId,
          shiftAttribute: {
            isActive: true,
            shift: {
              companyId: companyId
            }
          }
        },
        include: {
          shiftAttribute: {
            include: {
              shift: {
                select: {
                  companyId: true
                }
              }
            }
          }
        }
      });

      if (!userShift) {
        return {
          isInShift: false,
          message: 'No active shift assigned to user'
        };
      }

      const shiftAttribute = userShift.shiftAttribute;
      const currentTime = new Date();
      const currentDay = currentTime.getDay();

      const startTime = new Date(shiftAttribute.startTime);
      const endTime = new Date(shiftAttribute.endTime);

      const shiftStartToday = new Date(currentTime);
      shiftStartToday.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds(), 0);

      const shiftEndToday = new Date(currentTime);
      shiftEndToday.setHours(endTime.getHours(), endTime.getMinutes(), endTime.getSeconds(), 0);

      if (shiftEndToday <= shiftStartToday) {
        shiftEndToday.setDate(shiftEndToday.getDate() + 1);
      }

      const gracePeriodMs = (shiftAttribute.gracePeriodMinutes || 0) * 60 * 1000;
      const adjustedStartTime = new Date(shiftStartToday.getTime() - gracePeriodMs);
      const adjustedEndTime = new Date(shiftEndToday.getTime() + gracePeriodMs);

      const isInShiftTime = currentTime >= adjustedStartTime && currentTime <= adjustedEndTime;

      if (isInShiftTime) {
        return {
          isInShift: true,
          message: 'User is within assigned shift time',
          shiftDetails: {
            shiftName: shiftAttribute.shiftName,
            startTime: shiftAttribute.startTime,
            endTime: shiftAttribute.endTime,
            gracePeriodMinutes: shiftAttribute.gracePeriodMinutes,
            breakDuration: shiftAttribute.breakDuration,
            currentTime: currentTime,
            shiftStartToday: shiftStartToday,
            shiftEndToday: shiftEndToday
          }
        };
      } else {
        return {
          isInShift: false,
          message: 'User is outside assigned shift time',
          shiftDetails: {
            shiftName: shiftAttribute.shiftName,
            startTime: shiftAttribute.startTime,
            endTime: shiftAttribute.endTime,
            gracePeriodMinutes: shiftAttribute.gracePeriodMinutes,
            currentTime: currentTime,
            shiftStartToday: shiftStartToday,
            shiftEndToday: shiftEndToday
          }
        };
      }

    } catch (error) {
      console.error('Error checking user shift:', error);
      return {
        isInShift: false,
        message: 'Error checking shift assignment'
      };
    }
  }
}