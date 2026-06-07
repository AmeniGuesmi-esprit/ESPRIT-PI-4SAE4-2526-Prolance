import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface User {
  id: number;
  name: string;
  lastName: string;
  email: string;
  role: string;
  birthDate: string;
  avatar?: string;
  enabled?: boolean;
  bio?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8222/users';

  constructor(private http: HttpClient) { }

  // ── Avatar ─────────────────────────────────────────────────
  updateAvatar(userId: number, avatarBase64: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${userId}/avatar`,
      { avatar: avatarBase64 }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ── Bio ─────────────────────────────────────────────────────
  updateBio(userId: number, bio: string): Observable<{ bio: string }> {
    return this.http.put<{ bio: string }>(
      `${this.apiUrl}/${userId}/bio`,
      { bio }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ── CRUD ────────────────────────────────────────────────────
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(id: number, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData).pipe(
      catchError(this.handleError)
    );
  }

  changePassword(id: number, currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${id}/change-password`,
      { currentPassword, newPassword }
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteAccount(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  generateAiAvatar(prompt: string, seed: number): Observable<string> {
    return this.http
      .post<{ image: string }>('http://localhost:8222/api/ai/generate-avatar', { prompt, seed })
      .pipe(map(res => res.image));
  }

  // ── Error handler ───────────────────────────────────────────
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.status === 401) {
      errorMessage = 'Session expired. Please login again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission.';
    } else if (error.status === 404) {
      errorMessage = 'User not found.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => ({ message: errorMessage, status: error.status }));
  }
}