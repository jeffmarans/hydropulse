import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TrackMetric, TrackTrace } from 'hydropulse';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @TrackTrace('create_user')
  @TrackMetric('user_creation_requests')
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      return {
        success: true,
        data: user,
        message: 'User created successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to create user: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @TrackTrace('list_users')
  @TrackMetric('user_list_requests')
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new HttpException('Invalid pagination parameters', HttpStatus.BAD_REQUEST);
    }

    const users = await this.usersService.findAll(pageNum, limitNum);
    return {
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Get(':id')
  @TrackTrace('get_user_by_id')
  @TrackMetric('user_detail_requests')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    
    return {
      success: true,
      data: user,
    };
  }

  @Patch(':id')
  @TrackTrace('update_user')
  @TrackMetric('user_update_requests')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      const user = await this.usersService.update(+id, updateUserDto);
      return {
        success: true,
        data: user,
        message: 'User updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update user: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @TrackTrace('delete_user')
  @TrackMetric('user_deletion_requests')
  async remove(@Param('id') id: string) {
    try {
      await this.usersService.remove(+id);
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to delete user: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/stats')
  @TrackTrace('get_user_stats')
  @TrackMetric('user_stats_requests')
  async getUserStats(@Param('id') id: string) {
    const user = await this.usersService.findOne(+id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      data: {
        user_id: user.id,
        login_count: Math.floor(Math.random() * 100),
        last_login: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        total_orders: Math.floor(Math.random() * 20),
        total_spent: Math.floor(Math.random() * 1000),
        account_created: user.createdAt,
      },
    };
  }
}
