import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  AdPlan,
  AdCampaign,
  CreateCampaignRequest,
  RejectCampaignRequest,
  ContentValidationResponse,
  AiSuggestionResponse,
  AdContactResponse,
  RagResponse
} from '../pages/ads/models/ad.models';

const SESSION_STORAGE_KEY = 'sessionUser';
const JSON_CONTENT_HEADERS = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable({
  providedIn: 'root'
})
export class AdsService {

  private readonly baseUrl = environment.adsServiceUrl;

  constructor(private http: HttpClient, private router: Router) {}

  // ── Auth Helpers ────────────────────────────────

  private getToken(): string | null {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored).token || null;
    } catch {
      return null;
    }
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return token
      ? JSON_CONTENT_HEADERS.set('Authorization', `Bearer ${token}`)
      : JSON_CONTENT_HEADERS;
  }

  // ── Error Handler ───────────────────────────────

  private handleError(operation: string): (error: HttpErrorResponse) => Observable<never> {
    return (error: HttpErrorResponse): Observable<never> => {
      this.logHttpError(operation, error);
      return throwError(() => error);
    };
  }

  private logHttpError(operation: string, error: HttpErrorResponse): void {
    switch (error.status) {
      case 401:
        localStorage.removeItem(SESSION_STORAGE_KEY);
        this.router.navigate(['/login']);
        break;
      case 403:
        this.router.navigate(['/login']);
        break;
      default:
        break;
    }
  }

  // ── Plans ───────────────────────────────────────

  getPlans(): Observable<AdPlan[]> {
    return this.http.get<AdPlan[]>(`${this.baseUrl}/plans`, { headers: this.authHeaders() })
      .pipe(catchError(this.handleError('getPlans')));
  }

  // ── Campaigns (User) ───────────────────────────

  getMyCampaigns(): Observable<AdCampaign[]> {
    return this.http.get<AdCampaign[]>(`${this.baseUrl}/campaigns/my`, { headers: this.authHeaders() })
      .pipe(catchError(this.handleError('getMyCampaigns')));
  }

  createCampaign(data: CreateCampaignRequest): Observable<AdCampaign> {
    return this.http.post<AdCampaign>(`${this.baseUrl}/campaigns`, data, { headers: this.authHeaders() })
      .pipe(catchError(this.handleError('createCampaign')));
  }

  updateCampaign(id: number, data: CreateCampaignRequest): Observable<AdCampaign> {
    return this.http.put<AdCampaign>(`${this.baseUrl}/campaigns/${id}`, data, { headers: this.authHeaders() })
      .pipe(catchError(this.handleError('updateCampaign')));
  }

  deleteCampaign(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/campaigns/${id}`, { headers: this.authHeaders() })
      .pipe(catchError(this.handleError('deleteCampaign')));
  }

  // ── Campaigns (Public) ─────────────────────────

  getActiveAds(): Observable<AdCampaign[]> {
    return this.http.get<AdCampaign[]>(`${this.baseUrl}/campaigns/active`, { headers: JSON_CONTENT_HEADERS })
      .pipe(catchError(this.handleError('getActiveAds')));
  }

  getAdById(id: number): Observable<AdCampaign> {
    return this.http.get<AdCampaign>(`${this.baseUrl}/campaigns/${id}`, { headers: JSON_CONTENT_HEADERS })
      .pipe(catchError(this.handleError('getAdById')));
  }

  getContactInfo(adId: number): Observable<AdContactResponse> {
    return this.http.get<AdContactResponse>(`${this.baseUrl}/ads/${adId}/contact`, { headers: JSON_CONTENT_HEADERS })
      .pipe(catchError(this.handleError('getContactInfo')));
  }

  recordClick(campaignId: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/campaigns/${campaignId}/click`, {}, { headers: JSON_CONTENT_HEADERS })
      .pipe(catchError(this.handleError('recordClick')));
  }

  // ── Campaigns (Admin) ──────────────────────────

  getAllAdminCampaigns(): Observable<AdCampaign[]> {
    return this.http.get<AdCampaign[]>(`${this.baseUrl}/campaigns/admin/all`, { headers: this.authHeaders() })
      .pipe(catchError(this.handleError('getAllAdminCampaigns')));
  }

  adminApprove(id: number): Observable<AdCampaign> {
    return this.http.patch<AdCampaign>(`${this.baseUrl}/campaigns/admin/${id}/approve`, {}, { headers: this.authHeaders() })
      .pipe(catchError(this.handleError('adminApprove')));
  }

  adminReject(id: number, reason: string): Observable<AdCampaign> {
    const body: RejectCampaignRequest = { rejectionReason: reason };
    return this.http.patch<AdCampaign>(`${this.baseUrl}/campaigns/admin/${id}/reject`, body, { headers: this.authHeaders() })
      .pipe(catchError(this.handleError('adminReject')));
  }

  adminDelete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/campaigns/admin/${id}`, { headers: this.authHeaders() })
      .pipe(catchError(this.handleError('adminDelete')));
  }

  // ── AI Features ─────────────────────────────────

  validateAdContent(title: string, description: string): Observable<ContentValidationResponse> {
    return this.http.post<ContentValidationResponse>(
      `${this.baseUrl}/campaigns/validate`,
      { title, description },
      { headers: this.authHeaders() }
    ).pipe(catchError(this.handleError('validateAdContent')));
  }

  generateAiSuggestion(prompt: string): Observable<AiSuggestionResponse> {
    return this.http.post<AiSuggestionResponse>(
      `${this.baseUrl}/campaigns/generate-suggestion`,
      { prompt },
      { headers: this.authHeaders() }
    ).pipe(catchError(this.handleError('generateAiSuggestion')));
  }

  // ── RAG (Semantic Ad Search) ─────────────────────

  askRag(question: string): Observable<RagResponse> {
    return this.http.post<RagResponse>(
      `${this.baseUrl}/rag/ask`,
      { question },
      { headers: JSON_CONTENT_HEADERS }
    ).pipe(catchError(this.handleError('askRag')));
  }
}
