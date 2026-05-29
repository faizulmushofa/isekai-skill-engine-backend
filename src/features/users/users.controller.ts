import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse } from './mapper/user.mapper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Route ini harus diletakkan SEBELUM GET /users/:id untuk menghindari tabrakan rute (shadowing)
  @Get('me')
  @ApiOperation({ summary: 'Dapatkan profil pengguna yang sedang login' })
  @ApiResponse({ status: 200, description: 'Profil pengguna berhasil diambil' })
  async getMe(@CurrentUser() userId: string): Promise<UserResponse> {
    return this.usersService.findById(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Dapatkan profil pengguna berdasarkan ID' })
  @ApiParam({ name: 'id', description: 'UUID pengguna' })
  @ApiResponse({ status: 200, description: 'Profil pengguna berhasil diambil' })
  @ApiResponse({ status: 403, description: 'Tidak diizinkan mengakses profil pengguna lain' })
  @ApiResponse({ status: 404, description: 'Pengguna tidak ditemukan' })
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
  @ApiOperation({ summary: 'Update profil pengguna' })
  @ApiParam({ name: 'id', description: 'UUID pengguna' })
  @ApiResponse({ status: 200, description: 'Profil berhasil diupdate' })
  @ApiResponse({ status: 403, description: 'Tidak diizinkan mengubah profil pengguna lain' })
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
