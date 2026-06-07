import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RecommendationDTO {
  eventId:      string;
  eventName:    string;
  category:     string;
  level:        string;
  format:       string;
  avgRating:    number;
  hybridScore:  number;
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {

  private readonly BASE = 'http://localhost:8222/api/recommendations';

  constructor(private http: HttpClient) {}

  getRecommendations(userId: string, n = 6): Observable<RecommendationDTO[]> {
    return this.http.get<RecommendationDTO[]>(`${this.BASE}/${userId}?n=${n}`);
  }
}