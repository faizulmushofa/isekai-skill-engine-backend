import { User } from '@prisma/client';

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  careerGoal?: string | null;
}

export class UserMapper {
  static toResponse(user: any): UserResponse {
    const activeGoal = user.userGoals?.[0]?.careerGoal?.name || null;
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      careerGoal: activeGoal,
    };
  }
}
