  import { Injectable, ConflictException, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { CreateCompanyRoleDto } from './dto/create-companyrole.dto';

  @Injectable()
  export class CompanyRoleService {
    constructor(private prisma: PrismaService) {}

    async create(createCompanyRoleDto: CreateCompanyRoleDto) {
      try {
        console.log('Creating company role with data:', createCompanyRoleDto);
        
        
        // Validate DTO is not undefined
        if (!createCompanyRoleDto) {
          throw new BadRequestException('Request body is required');
        }

        // Validate required fields
        if (!createCompanyRoleDto.name) {
          throw new BadRequestException('Role name is required');
        }

        if (!createCompanyRoleDto.companyId) {
          throw new BadRequestException('Company ID is required');
        }

        // Check if company exists
        const company = await this.prisma.company.findUnique({
          where: { id: createCompanyRoleDto.companyId },
        });

        if (!company) {
          throw new NotFoundException('Company not found');
        }

        // Check if role with same name already exists in this company
        const existingRole = await this.prisma.companyRole.findFirst({
          where: {
            name: createCompanyRoleDto.name,
            companyId: createCompanyRoleDto.companyId,
          },
        });

        if (existingRole) {
          throw new ConflictException('Role with this name already exists in this company');
        }

        const companyRole = await this.prisma.companyRole.create({
          data: {
            name: createCompanyRoleDto.name,
            description: createCompanyRoleDto.description,
            companyId: createCompanyRoleDto.companyId,
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            companyUsers: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        return {
          message: 'Company role created successfully',
          data: companyRole,
        };
      } catch (error) {
        console.error('Error creating company role:', error);
        
        if (error instanceof BadRequestException || 
            error instanceof ConflictException || 
            error instanceof NotFoundException) {
          throw error;
        }
        
        throw new InternalServerErrorException('Failed to create company role');
      }
    }
  }