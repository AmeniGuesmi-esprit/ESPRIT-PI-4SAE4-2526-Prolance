import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  PromoCode,
  PromoRecommendation,
  PromoRecommendationResponse,
  PromoStats
} from '../models/promo.model';

@Injectable({
  providedIn: 'root'
})
export class PromoService {
  private apiUrl = 'http://localhost:8222/api/promos';
  private paymentUrl = 'http://localhost:8222/api/payments';

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════════════════════════
  //  RECOMMANDATIONS IA
  // ══════════════════════════════════════════════════════════════

  /**
   * Obtenir les recommandations IA de codes promo
   */
  getAIRecommendations(
    userType: 'FREELANCER' | 'CLIENT',
    planTier?: string,
    userId?: number
  ): Observable<PromoRecommendationResponse> {
    let params = new HttpParams().set('userType', userType);
    if (planTier) params = params.set('planTier', planTier);
    if (userId) params = params.set('userId', userId.toString());

    return this.http.get<PromoRecommendationResponse>(`${this.apiUrl}/ai/recommend`, { params })
      .pipe(
        catchError(() => this.getDemoRecommendations(userType))
      );
  }

  /**
   * Données de démo en cas d'erreur backend
   */
  private getDemoRecommendations(userType: string): Observable<PromoRecommendationResponse> {
    const demoData: PromoRecommendationResponse = {
      success: true,
      recommendations: [
        {
          id: 1,
          code: 'WELCOME10',
          discountPercent: 10,
          description: 'Bienvenue - 10% de réduction',
          expiresAt: '2026-12-31T23:59:59',
          remainingUses: 95,
          aiReason: '🎯 Spécialement conçu pour les nouveaux membres. 🆕 Offre spéciale nouveaux membres !',
          relevanceScore: 85,
          targetAudience: 'ALL',
          isPersonalized: true
        },
        {
          id: 2,
          code: 'PRO50',
          discountPercent: 50,
          description: 'Upgrade Pro - 50% première période',
          expiresAt: '2026-06-30T23:59:59',
          remainingUses: 12,
          aiReason: '💰 Réduction exceptionnelle de 50%. 🔥 Seulement 12 codes restants ! 💎 Parfait pour votre upgrade Pro.',
          relevanceScore: 92,
          targetAudience: 'ALL',
          isPersonalized: false
        },
        {
          id: 3,
          code: userType === 'FREELANCER' ? 'FREELANCER15' : 'NEWCLIENT20',
          discountPercent: userType === 'FREELANCER' ? 15 : 20,
          description: userType === 'FREELANCER' ? 'Spécial Freelancers - 15%' : 'Nouveaux clients - 20%',
          expiresAt: '2026-12-31T23:59:59',
          remainingUses: userType === 'FREELANCER' ? 180 : 85,
          aiReason: userType === 'FREELANCER' 
            ? '🎯 Spécialement conçu pour les freelancers. ✨ Belle économie de 15%.'
            : '🎯 Spécialement conçu pour les clients. ✨ Belle économie de 20%.',
          relevanceScore: 78,
          targetAudience: userType,
          isPersonalized: true
        }
      ],
      totalFound: 3,
      generatedAt: new Date().toISOString(),
      aiModel: 'PromoRecommender-Demo'
    };

    return of(demoData).pipe(delay(800));
  }

  // ══════════════════════════════════════════════════════════════
  //  VALIDATION CODE PROMO
  // ══════════════════════════════════════════════════════════════

  validatePromoCode(code: string): Observable<any> {
    return this.http.get(`${this.paymentUrl}/promo/validate/${code}`);
  }

  applyPromoCode(code: string): Observable<any> {
    return this.http.post(`${this.paymentUrl}/promo/apply/${code}`, {});
  }

  // ══════════════════════════════════════════════════════════════
  //  CRUD ADMIN
  // ══════════════════════════════════════════════════════════════

  getAllPromos(): Observable<PromoCode[]> {
    return this.http.get<PromoCode[]>(this.apiUrl);
  }

  getPromoById(id: number): Observable<PromoCode> {
    return this.http.get<PromoCode>(`${this.apiUrl}/${id}`);
  }

  createPromo(promo: Partial<PromoCode>): Observable<PromoCode> {
    return this.http.post<PromoCode>(this.apiUrl, promo);
  }

  updatePromo(id: number, promo: Partial<PromoCode>): Observable<PromoCode> {
    return this.http.put<PromoCode>(`${this.apiUrl}/${id}`, promo);
  }

  deletePromo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  togglePromo(id: number): Observable<PromoCode> {
    return this.http.patch<PromoCode>(`${this.apiUrl}/${id}/toggle`, {});
  }

  generateAIPromo(
    targetType: string,
    discount: number,
    maxUses: number,
    validDays: number
  ): Observable<any> {
    const params = new HttpParams()
      .set('targetType', targetType)
      .set('discount', discount.toString())
      .set('maxUses', maxUses.toString())
      .set('validDays', validDays.toString());
    
    return this.http.post(`${this.apiUrl}/ai/generate`, null, { params });
  }

  getStats(): Observable<PromoStats> {
    return this.http.get<PromoStats>(`${this.apiUrl}/stats`);
  }
}