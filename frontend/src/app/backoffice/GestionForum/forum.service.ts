import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Publication {
  id: number;
  titre: string;
  contenue: string;
  type: 'QUESTION' | 'ARTICLE' | 'REVIEW';
  statut: 'ACTIVE' | 'ARCHIVED'; // PENDING supprimé
  createAt: string;
  archivedAt?: string;
  images: string[];
  pdfs: string[];
  signalements?: number[];
  signalementRaisons?: string[]; // raisons des signalements
  warningCount?: number;
  user: { id: number; name: string; lastName: string; email: string; };
  commentaires: Commentaire[];
  commentCount?: number;
}

export interface Commentaire {
  id: number;
  contenue: string;
  createAt: string;
  userId?: number;
  publicationId?: number;
  user: { id: number; name: string; lastName: string; email: string; };
  publication?: { id: number; titre: string; };
  parent?: { id: number; };
  replies: Commentaire[];
}

export interface ReactionSummary {
  LIKE: number;
  DISLIKE: number;
  HEART: number;
  userReaction: string | null;
  reactors: { userId: number; userName: string; type: string; }[];
}

/** DTO retourné par /admin/blocked-users */
export interface UserBlockDTO {
  userId: number;
  name: string;
  lastName: string;
  warningCount: number; // correspond au nombre de posts archivés
  blocked: boolean;
}

@Injectable({ providedIn: 'root' })
export class ForumService {
  private readonly apiBase = 'http://localhost:8222/api';

  constructor(private http: HttpClient) {}

  // ── Publications ──────────────────────────────────────────────────

  getAllPublications(): Observable<Publication[]> {
    return this.http.get<Publication[]>(`${this.apiBase}/publications/admin/all`);
  }

  adminDeletePublication(id: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/publications/admin/${id}`, { responseType: 'text' });
  }

  deletePublication(id: number, userId: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/publications/${id}?userId=${userId}`, { responseType: 'text' });
  }

  // ── Signalement ───────────────────────────────────────────────────

  /**
   * Signale une publication avec une raison.
   */
  signalerPublication(id: number, userId: number, raison: string): Observable<Publication> {
    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('raison', raison);
    return this.http.post<Publication>(`${this.apiBase}/publications/${id}/signaler`, null, { params });
  }

  // ── Blocage utilisateurs ──────────────────────────────────────────

  getBlockedUsers(): Observable<UserBlockDTO[]> {
    return this.http.get<UserBlockDTO[]>(`${this.apiBase}/publications/admin/blocked-users`);
  }

  /**
   * Réactive le compte : supprime les posts archivés + reset signalements.
   */
  reactiverCompteUser(userId: number): Observable<any> {
    return this.http.post(`${this.apiBase}/publications/admin/users/${userId}/reactiver-compte`, null);
  }

  // ── Commentaires ──────────────────────────────────────────────────

  getAllCommentaires(): Observable<Commentaire[]> {
    return this.http.get<Commentaire[]>(`${this.apiBase}/commentaires`);
  }

  getCommentairesByPublication(publicationId: number): Observable<Commentaire[]> {
    return this.http.get<Commentaire[]>(`${this.apiBase}/commentaires/publication/${publicationId}`);
  }

  private countTotal(comments: Commentaire[]): number {
    return comments.reduce((acc, c) => acc + 1 + this.countTotal(c.replies || []), 0);
  }

  getCommentCountByPublication(publicationId: number): Observable<number> {
    return new Observable(observer => {
      this.http.get<Commentaire[]>(`${this.apiBase}/commentaires/publication/${publicationId}`)
        .subscribe({
          next: (comments) => { observer.next(this.countTotal(comments)); observer.complete(); },
          error: () => { observer.next(0); observer.complete(); }
        });
    });
  }

  deleteCommentaire(id: number, userId: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/commentaires/${id}?userId=${userId}`, { responseType: 'text' });
  }

  // ── Réactions ─────────────────────────────────────────────────────

  getReactionSummary(publicationId: number): Observable<ReactionSummary> {
    const params = new HttpParams().set('userId', '0');
    return this.http.get<ReactionSummary>(
      `${this.apiBase}/reactions/publication/${publicationId}/summary`,
      { params }
    );
  }
}