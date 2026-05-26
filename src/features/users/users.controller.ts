import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse } from './mapper/user.mapper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Route ini harus diletakkan SEBELUM GET /users/:id untuk menghindari tabrakan rute (shadowing)
  @Get('me')
  async getMe(@CurrentUser() userId: string): Promise<UserResponse> {
    return this.usersService.findById(userId);
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<UserResponse> {
    if (id !== userId) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk melihat profil pengguna lain',
      );
    }
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
    @CurrentUser() userId: string,
  ): Promise<UserResponse> {
    if (id !== userId) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk mengubah profil pengguna lain',
      );
    }
    return this.usersService.updateUser(id, payload);
  }
}
