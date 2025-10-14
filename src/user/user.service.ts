import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
        },
        include: {
          companyUsers: {
            include: {
              company: true,
              role: true,
            },
          },
        },
      });

      return {
        message: 'User created successfully',
        data: user,
      };
    } catch (error) {
      if (error.code === 'P2002') { // Unique constraint violation
        throw new ConflictException('User with this email already exists');
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll() {
    try {
      const users = await this.prisma.user.findMany({
        include: {
          companyUsers: {
            include: {
              company: true,
              role: true,
            },
          },
        },
        
      });

      return {
        message: 'Users retrieved successfully',
        data: users,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve users');
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          companyUsers: {
            include: {
              company: true,
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        message: 'User retrieved successfully',
        data: user,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve user');
    }
  }

  async findByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          companyUsers: {
            include: {
              company: true,
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        message: 'User retrieved successfully',
        data: user,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve user');
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      // Check if email is being updated and if it conflicts with another user
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        const userWithSameEmail = await this.prisma.user.findFirst({
          where: {
            email: updateUserDto.email,
            id: { not: id },
          },
        });

        if (userWithSameEmail) {
          throw new ConflictException('User with this email already exists');
        }
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          ...updateUserDto,
        },
        include: {
          companyUsers: {
            include: {
              company: true,
              role: true,
            },
          },
        },
      });

      return {
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async remove(id: string) {
    try {
      // Check if user exists
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      await this.prisma.user.delete({
        where: { id },
      });

      return {
        message: 'User deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  async getUserCompanies(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          companyUsers: {
            include: {
              company: true,
              role: true,
            },
            where: {
              isActive: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        message: 'User companies retrieved successfully',
        data: user.companyUsers,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve user companies');
    }
  }

 
}