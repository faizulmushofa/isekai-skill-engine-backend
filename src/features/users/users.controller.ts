import { Controller, Get, Patch, Param, Body, Req, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse } from './mapper/user.mapper';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Route ini harus diletakkan SEBELUM GET /users/:id untuk menghindari tabrakan rute (shadowing)
  @Get('me')
  async getMe(@Req() req: any): Promise<UserResponse> {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Pengguna tidak terautentikasi (ID pengguna tidak ditemukan di request context)');
    }
    return this.usersService.findById(userId);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.updateUser(id, payload);
  }
}
