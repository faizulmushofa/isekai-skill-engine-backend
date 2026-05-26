import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserMapper, UserResponse } from './mapper/user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(userId: string): Promise<UserResponse> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }
    return UserMapper.toResponse(user);
  }

  async findByEmail(email: string): Promise<UserResponse> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email '${email}' not found`);
    }
    return UserMapper.toResponse(user);
  }

  async updateUser(userId: string, payload: UpdateUserDto): Promise<UserResponse> {
    // 1. Pastikan user dengan ID tersebut ada di database
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    const updateData: { username?: string } = {};

    // 2. Validasi & Aturan Email Immutable (Tidak boleh diubah)
    if (payload.email !== undefined && payload.email !== user.email) {
      throw new BadRequestException('Email bersifat immutable dan tidak dapat diubah');
    }

    // 3. Validasi & Aturan Username (Optional but Unique)
    if (payload.username !== undefined) {
      const trimmedUsername = payload.username.trim();
      if (trimmedUsername === '') {
        throw new BadRequestException('Username tidak boleh kosong');
      }

      if (trimmedUsername !== user.username) {
        const existingUser = await this.usersRepository.findByUsername(trimmedUsername);
        if (existingUser && existingUser.id !== userId) {
          throw new ConflictException(`Username '${trimmedUsername}' sudah digunakan oleh pengguna lain`);
        }
      }
      updateData.username = trimmedUsername;
    }

    // 4. Eksekusi update di database via Repository
    const updatedUser = await this.usersRepository.update(userId, updateData);
    return UserMapper.toResponse(updatedUser);
  }
}
