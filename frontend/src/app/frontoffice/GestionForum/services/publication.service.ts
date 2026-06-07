import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Publication, TypePublication } from '../models/publication.model';

export interface BlockStatus {
  blocked: boolean;
  warningCount: number; // correspond au nombre de posts archivés côté back
}

@Injectable({ providedIn: 'root' })
export class PublicationService {
  private baseUrl = 'http://localhost:8222/api/publications';

  constructor(private http: HttpClient) {}

  // ── Lecture ──────────────────────────────────────────────────────

  /** Feed public : seulement les publications ACTIVES */
  getAllPublications(): Observable<Publication[]> {
    return this.http.get<Publication[]>(this.baseUrl);
  }

  getPublicationsByType(type: TypePublication): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.baseUrl}/type/${type}`);
  }

  getPublicationsByUserId(userId: number): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.baseUrl}/user/${userId}`);
  }

  /** Publications archivées de l'utilisateur */
  getArchivedByUserId(userId: number): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.baseUrl}/user/${userId}/archived`);
  }

  getPublicationById(id: number): Observable<Publication> {
    return this.http.get<Publication>(`${this.baseUrl}/${id}`);
  }

  // ── Blocage ──────────────────────────────────────────────────────

  /**
   * Vérifie si un utilisateur est bloqué (>= 3 posts archivés).
   * Retourne { blocked: boolean, warningCount: number }
   */
  getBlockStatus(userId: number): Observable<BlockStatus> {
    return this.http.get<BlockStatus>(`${this.baseUrl}/user/${userId}/block-status`);
  }

  // ── Signalement ──────────────────────────────────────────────────

  /**
   * Signale une publication avec une raison.
   * 3 signalements → archivage automatique.
   */
  signalerPublication(id: number, userId: number, raison: string): Observable<Publication> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('raison', raison);
    return this.http.post<Publication>(`${this.baseUrl}/${id}/signaler`, null, { params });
  }

  // ── CRUD ─────────────────────────────────────────────────────────

  createPublication(formData: FormData): Observable<Publication> {
    return this.http.post<Publication>(this.baseUrl, formData);
  }

  updatePublication(id: number, formData: FormData): Observable<Publication> {
    return this.http.put<Publication>(`${this.baseUrl}/${id}`, formData);
  }

  deletePublication(id: number, userId: number): Observable<any> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http.delete(`${this.baseUrl}/${id}`, { params, responseType: 'text' });
  }
}