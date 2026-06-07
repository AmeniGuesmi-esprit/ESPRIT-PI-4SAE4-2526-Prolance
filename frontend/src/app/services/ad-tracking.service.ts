import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AdEventType } from '../pages/ads/models/ad.models';

export interface AdEventPayload {
  readonly adId: number;
  readonly type: AdEventType;
}

const SESSION_STORAGE_KEY = 'sessionUser';
const JSON_CONTENT_HEADERS = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable({
  providedIn: 'root'
})
export class AdTrackingService {

  private readonly eventsUrl = `${environment.adsServiceUrl}/ads/events`;

  constructor(private http: HttpClient) {}

  /**
   * Fire-and-forget event tracking.
   * Sends event to Kafka without blocking UI.
   */
  sendEvent(adId: number, type: AdEventType): void {
    const payload: AdEventPayload = { adId, type };
    const headers = this.buildHeaders();

    this.http.post(this.eventsUrl, payload, { headers }).subscribe({
      error: () => { /* Silent fail - never disrupt user experience */ }
    });
  }

  private buildHeaders(): HttpHeaders {
    const token = this.extractToken();
    return token
      ? JSON_CONTENT_HEADERS.set('Authorization', `Bearer ${token}`)
      : JSON_CONTENT_HEADERS;
  }

  private extractToken(): string | null {
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
}
