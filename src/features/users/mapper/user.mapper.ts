import { User } from '../../../../generated/prisma/client';

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

export class UserMapper {
  static toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    };
  }
}
