import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { CompanyUserStatus } from '@prisma/client';

@Injectable()
export class CompanyUserService {
  constructor(private prisma: PrismaService) {}

  async create(createCompanyUserDto: CreateCompanyUserDto) {
    try {
      // Check if user already exists in this company
      const existingCompanyUser = await this.prisma.companyUser.findUnique({
        where: {
          userId_companyId: {
            userId: createCompanyUserDto.userId,
            companyId: createCompanyUserDto.companyId,
          },
        },
      });

      if (existingCompanyUser) {
        throw new ConflictException('User already exists in this company');
      }

      // Check if company exists
      const company = await this.prisma.company.findUnique({
        where: { id: createCompanyUserDto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: createCompanyUserDto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if role exists (if provided)
      if (createCompanyUserDto.roleId) {
        const role = await this.prisma.companyRole.findUnique({
          where: { id: createCompanyUserDto.roleId },
        });

        if (!role) {
          throw new NotFoundException('Role not found');
        }

        // Verify role belongs to the same company
        if (role.companyId !== createCompanyUserDto.companyId) {
          throw new BadRequestException('Role does not belong to the specified company');
        }
      }

      const companyUser = await this.prisma.companyUser.create({
        data: {
          ...createCompanyUserDto,
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      });

      return {
        message: 'Company user created successfully',
        data: companyUser,
      };
    } catch (error) {
      if (error instanceof ConflictException || 
          error instanceof NotFoundException ||
          error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to create company user');
    }
  }

  async findAll() {
    try {
      const companyUsers = await this.prisma.companyUser.findMany({
        include: {
          user: true,
          company: true,
          role: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        message: 'Company users retrieved successfully',
        data: companyUsers,
      };
    } catch (error) {
      throw new Error('Failed to retrieve company users');
    }
  }

  async findOne(id: string) {
    try {
      const companyUser = await this.prisma.companyUser.findUnique({
        where: { id },
        include: {
          user: true,
          company: true,
          role: true,
        },
      });

      if (!companyUser) {
        throw new NotFoundException('Company user not found');
      }

      return {
        message: 'Company user retrieved successfully',
        data: companyUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to retrieve company user');
    }
  }

  async findByCompany(companyId: string) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      const companyUsers = await this.prisma.companyUser.findMany({
        where: { companyId },
        include: {
          user: true,
          role: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        message: 'Company users retrieved successfully',
        data: companyUsers,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to retrieve company users');
    }
  }

  async findByUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const companyUsers = await this.prisma.companyUser.findMany({
        where: { userId },
        include: {
          company: true,
          role: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        message: 'User companies retrieved successfully',
        data: companyUsers,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to retrieve user companies');
    }
  }

  async update(id: string, updateCompanyUserDto: UpdateCompanyUserDto) {
    try {
      const existingCompanyUser = await this.prisma.companyUser.findUnique({
        where: { id },
      });

      if (!existingCompanyUser) {
        throw new NotFoundException('Company user not found');
      }

      // Check if role exists and belongs to the same company (if provided)
      if (updateCompanyUserDto.roleId) {
        const role = await this.prisma.companyRole.findUnique({
          where: { id: updateCompanyUserDto.roleId },
        });

        if (!role) {
          throw new NotFoundException('Role not found');
        }

        // Verify role belongs to the same company as the company user
        if (role.companyId !== existingCompanyUser.companyId) {
          throw new BadRequestException('Role does not belong to the same company');
        }
      }

      const updatedCompanyUser = await this.prisma.companyUser.update({
        where: { id },
        data: {
          ...updateCompanyUserDto,
          updatedAt: new Date(),
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      });

      return {
        message: 'Company user updated successfully',
        data: updatedCompanyUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to update company user');
    }
  }

  async remove(id: string) {
    try {
      const existingCompanyUser = await this.prisma.companyUser.findUnique({
        where: { id },
      });

      if (!existingCompanyUser) {
        throw new NotFoundException('Company user not found');
      }

      await this.prisma.companyUser.delete({
        where: { id },
      });

      return {
        message: 'Company user deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to delete company user');
    }
  }

  async updateStatus(id: string, status: CompanyUserStatus) {
    try {
      const existingCompanyUser = await this.prisma.companyUser.findUnique({
        where: { id },
      });

      if (!existingCompanyUser) {
        throw new NotFoundException('Company user not found');
      }

      const updatedCompanyUser = await this.prisma.companyUser.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date(),
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      });

      return {
        message: 'Company user status updated successfully',
        data: updatedCompanyUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to update company user status');
    }
  }

  async assignRole(id: string, roleId: string) {
    try {
      const existingCompanyUser = await this.prisma.companyUser.findUnique({
        where: { id },
      });

      if (!existingCompanyUser) {
        throw new NotFoundException('Company user not found');
      }

      const role = await this.prisma.companyRole.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      // Verify role belongs to the same company
      if (role.companyId !== existingCompanyUser.companyId) {
        throw new BadRequestException('Role does not belong to the same company');
      }

      const updatedCompanyUser = await this.prisma.companyUser.update({
        where: { id },
        data: {
          roleId,
          updatedAt: new Date(),
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      });

      return {
        message: 'Role assigned successfully',
        data: updatedCompanyUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to assign role');
    }
  }

  async removeRole(id: string) {
    try {
      const existingCompanyUser = await this.prisma.companyUser.findUnique({
        where: { id },
      });

      if (!existingCompanyUser) {
        throw new NotFoundException('Company user not found');
      }

      const updatedCompanyUser = await this.prisma.companyUser.update({
        where: { id },
        data: {
          roleId: null,
          updatedAt: new Date(),
        },
        include: {
          user: true,
          company: true,
          role: true,
        },
      });

      return {
        message: 'Role removed successfully',
        data: updatedCompanyUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to remove role');
    }
  }
}