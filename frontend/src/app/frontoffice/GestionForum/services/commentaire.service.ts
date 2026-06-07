import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Commentaire } from '../models/commentaire.model';

@Injectable({
  providedIn: 'root'
})
export class CommentaireService {
  private baseUrl = 'http://localhost:8222/api/commentaires';

  constructor(private http: HttpClient) {}

  getAllCommentaires(): Observable<Commentaire[]> {
    return this.http.get<Commentaire[]>(this.baseUrl);
  }

  getCommentairesByPublicationId(publicationId: number): Observable<Commentaire[]> {
    return this.http.get<Commentaire[]>(`${this.baseUrl}/publication/${publicationId}`);
  }

  // Compte récursif : parents + toutes leurs replies imbriquées
  private countTotal(comments: Commentaire[]): number {
    return comments.reduce((acc, c) => acc + 1 + this.countTotal(c.replies || []), 0);
  }

  // Retourne le nombre total : commentaires parents + replies
  getCommentCountByPublicationId(publicationId: number): Observable<number> {
    return this.http.get<Commentaire[]>(`${this.baseUrl}/publication/${publicationId}`)
      .pipe(map(comments => this.countTotal(comments)));
  }

  getCommentaireById(id: number): Observable<Commentaire> {
    return this.http.get<Commentaire>(`${this.baseUrl}/${id}`);
  }

  createCommentaire(contenue: string, publicationId: number, userId: number): Observable<Commentaire> {
    const params = new HttpParams()
      .set('contenue', contenue)
      .set('publicationId', publicationId.toString())
      .set('userId', userId.toString());
    return this.http.post<Commentaire>(this.baseUrl, null, { params });
  }

  replyToCommentaire(contenue: string, parentId: number, publicationId: number, userId: number): Observable<Commentaire> {
    const params = new HttpParams()
      .set('contenue', contenue)
      .set('publicationId', publicationId.toString())
      .set('userId', userId.toString());
    return this.http.post<Commentaire>(`${this.baseUrl}/${parentId}/reply`, null, { params });
  }

  updateCommentaire(id: number, contenue: string, userId: number): Observable<Commentaire> {
    const params = new HttpParams()
      .set('contenue', contenue)
      .set('userId', userId.toString());
    return this.http.put<Commentaire>(`${this.baseUrl}/${id}`, null, { params });
  }

  deleteCommentaire(id: number, userId: number): Observable<any> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http.delete(`${this.baseUrl}/${id}`, { params, responseType: 'text' });
  }

  togglePin(commentaireId: number, userId: number): Observable<Commentaire> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http.put<Commentaire>(`${this.baseUrl}/${commentaireId}/pin`, null, { params });
  }
}