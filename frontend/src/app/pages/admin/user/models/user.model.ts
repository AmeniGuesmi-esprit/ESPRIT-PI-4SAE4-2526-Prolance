export type UserRole = 'ADMIN' | 'USER' | 'CLIENT' | 'FREELANCER';

export interface AdminUser {
  id: number;
  name: string;
  lastName?: string | null;
  email: string;
  role: UserRole;
  enabled: boolean;
  birthDate?: string;
  timedOut?: boolean;
  timeoutUntil?: string | null;
  reportCount?: number;
}

