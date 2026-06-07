import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AdminUser } from '../pages/admin/user/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private apiUrl    = 'http://localhost:8222/api/auth/users';  // GET list
  private updateUrl = 'http://localhost:8222/users';           // moderation

  constructor(private http: HttpClient) {}

  getAll(): Observable<AdminUser[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(res => {
        if (res.data) return res.data as AdminUser[];
        return res as AdminUser[];
      })
    );
  }

  report(id: number): Observable<any> {
    return this.http.post(`${this.updateUrl}/${id}/report`, {});
  }

  timeout(id: number, until: string): Observable<any> {
    return this.http.post(`${this.updateUrl}/${id}/timeout`, { until });
  }

  liftTimeout(id: number): Observable<any> {
    return this.http.post(`${this.updateUrl}/${id}/lift-timeout`, {});
  }

  deactivate(id: number): Observable<any> {
    return this.http.put(`${this.updateUrl}/${id}/deactivate`, {});
  }

  reactivate(id: number): Observable<any> {
    return this.http.put(`${this.updateUrl}/${id}`, { enabled: true });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.updateUrl}/${id}`);
  }
}