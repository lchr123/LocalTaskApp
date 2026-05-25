export interface User {
  id: string;
  email: string;
  phone: string;
  nickname: string;
  avatarUrl?: string;
  averageRating: number;
  completedTaskCount: number;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
}
