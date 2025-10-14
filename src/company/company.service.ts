import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto) {
    console.log("api call")
    try {
      // Check if company with same name already exists
      const existingCompany = await this.prisma.company.findFirst({
        where: {
          name: createCompanyDto.name,
        },
      });

      if (existingCompany) {
        throw new ConflictException('Company with this name already exists');
      }

      const company = await this.prisma.company.create({
        data: {
          ...createCompanyDto,
        },
      });

      return {
        message: 'Company created successfully',
        data: company,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Failed to create company');
    }
  }

  async findAll() {
    try {
      const companies = await this.prisma.company.findMany({
        include: {
          companyUsers: {
            include: {
              user: true,
              role: true,
            },
          },
          companyRoles: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        message: 'Companies retrieved successfully',
        data: companies,
      };
    } catch (error) {
      throw new Error('Failed to retrieve companies');
    }
  }

  async findOne(id: string) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id },
        include: {
          companyUsers: {
            include: {
              user: true,
              role: true,
            },
          },
          companyRoles: true,
        },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      return {
        message: 'Company retrieved successfully',
        data: company,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to retrieve company');
    }
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    try {
      // Check if company exists
      const existingCompany = await this.prisma.company.findUnique({
        where: { id },
      });

      if (!existingCompany) {
        throw new NotFoundException('Company not found');
      }

      // Check if name is being updated and if it conflicts with another company
      if (updateCompanyDto.name && updateCompanyDto.name !== existingCompany.name) {
        const companyWithSameName = await this.prisma.company.findFirst({
          where: {
            name: updateCompanyDto.name,
            id: { not: id },
          },
        });

        if (companyWithSameName) {
          throw new ConflictException('Company with this name already exists');
        }
      }

      const updatedCompany = await this.prisma.company.update({
        where: { id },
        data: {
          ...updateCompanyDto,
          updatedAt: new Date(),
        },
      });

      return {
        message: 'Company updated successfully',
        data: updatedCompany,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Failed to update company');
    }
  }

  async remove(id: string) {
    try {
      // Check if company exists
      const existingCompany = await this.prisma.company.findUnique({
        where: { id },
      });

      if (!existingCompany) {
        throw new NotFoundException('Company not found');
      }

      await this.prisma.company.delete({
        where: { id },
      });

      return {
        message: 'Company deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to delete company');
    }
  }

  async getCompanyUsers(companyId: string) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: {
          companyUsers: {
            include: {
              user: true,
              role: true,
            },
            where: {
              isActive: true,
            },
          },
        },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      return {
        message: 'Company users retrieved successfully',
        data: company.companyUsers,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to retrieve company users');
    }
  }

  async getCompanyRoles(companyId: string) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: {
          companyRoles: true,
        },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      return {
        message: 'Company roles retrieved successfully',
        data: company.companyRoles,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error('Failed to retrieve company roles');
    }
  }
}