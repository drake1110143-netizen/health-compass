export type UserRole = 'doctor' | 'patient';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface AuthContext {
  userId: string;
  role: UserRole;
}
