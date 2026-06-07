import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserSuggestion {
  id: number;
  name: string;
  lastName: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserSearchService {
  private baseUrl = 'http://localhost:8222/users/search';

  constructor(private http: HttpClient) {}

  searchUsers(query: string): Observable<UserSuggestion[]> {
    if (!query || query.trim().length === 0) {
      return this.getAllUsers();
    }
    const params = new HttpParams().set('query', query);
    return this.http.get<UserSuggestion[]>(this.baseUrl, { params });
  }

  getAllUsers(): Observable<UserSuggestion[]> {
    return this.http.get<UserSuggestion[]>('http://localhost:8222/users/all');
  }
}