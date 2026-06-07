import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReactionSummaryDTO, ReactionType } from '../models/reaction.model';

@Injectable({ providedIn: 'root' })
export class ReactionService {

  private baseUrl = 'http://localhost:8222/api/reactions';

  constructor(private http: HttpClient) {}

  /**
   * POST /api/reactions/publication/{id}?userId=X&type=LIKE
   * Returns Reaction object (200) or empty body (204 when removed).
   */
  toggleReaction(publicationId: number, userId: number, type: ReactionType): Observable<any> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('type', type);
    return this.http.post<any>(
      `${this.baseUrl}/publication/${publicationId}`,
      null,
      { params }
    );
  }

  /**
   * GET /api/reactions/publication/{id}/summary?userId=X
   */
  getSummary(publicationId: number, userId: number): Observable<ReactionSummaryDTO> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http.get<ReactionSummaryDTO>(
      `${this.baseUrl}/publication/${publicationId}/summary`,
      { params }
    );
  }
}