// src/app/authentification/auth/auth.models.ts

export interface RegisterRequest {
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  birthDate?: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  id: number;
  token: string;
  role: 'ADMIN' | 'USER' | 'CLIENT' | 'FREELANCER';
  name: string;
  lastName: string;
  imageUrl?: string;

}