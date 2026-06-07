import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Subscription } from '../models/subscription.model';
import { UserSubscription } from '../models/user-subscription.model';
import { AuthService } from './auth.services';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {

private apiUrl = 'http://localhost:8222/api/subscriptions';
private userSubUrl = 'http://localhost:8222/api/user-subscriptions';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // ================================================
  // 📋 PLANS (Subscription) — ADMIN + FRONT
  // ================================================

  getAllSubscriptions(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(this.apiUrl);
  }

  getActiveSubscriptions(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.apiUrl}/active`);
  }

  getSubscriptionsByType(type: string): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.apiUrl}/type/${type}`);
  }

  getSubscriptionById(id: number): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.apiUrl}/${id}`);
  }

  createSubscription(subscription: Subscription): Observable<Subscription> {
    return this.http.post<Subscription>(this.apiUrl, subscription);
  }

  updateSubscription(id: number, subscription: Partial<Subscription>): Observable<Subscription> {
    return this.http.put<Subscription>(`${this.apiUrl}/${id}`, subscription);
  }

  deleteSubscription(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  activateSubscription(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivateSubscription(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  // ================================================
  // 👤 USER SUBSCRIPTIONS — FRONT
  // ================================================

  /** Returns the authenticated user's numeric ID, throws if not logged in. */
  private getUserId(): number {
    const userId = this.authService.getCurrentUser()?.id ?? null;
    if (userId === null || userId === 0) throw new Error('Utilisateur non connecté');
    return userId;
  }

  /**
   * Subscribe to a plan with optional payment details
   * @param subscriptionId - The plan ID to subscribe to
   * @param autoRenew - Whether to auto-renew the subscription
   * @param paymentMethod - Optional payment method (default: 'CREDIT_CARD')
   * @param transactionId - Optional transaction ID (auto-generated if not provided)
   * @param amountPaid - Optional amount paid
   */
  subscribe(
    subscriptionId: number,
    autoRenew: boolean = true,
    paymentMethod?: string,
    transactionId?: string,
    amountPaid?: number
  ): Observable<UserSubscription> {
    const userId = this.getUserId();
    
    const body: any = {
      userId,
      subscriptionId,
      autoRenew,
      paymentMethod: paymentMethod || 'CREDIT_CARD',
      transactionId: transactionId || 'TXN-' + Date.now()
    };
    
    if (amountPaid !== undefined) {
      body.amountPaid = amountPaid;
    }
    
    return this.http.post<UserSubscription>(`${this.userSubUrl}/subscribe`, body);
  }

  // GET /api/user-subscriptions/user/:userId/active
  getMySubscription(): Observable<UserSubscription> {
    const userId = this.getUserId();
    return this.http.get<UserSubscription>(`${this.userSubUrl}/user/${userId}/active`);
  }

  // GET /api/user-subscriptions/user/:userId/history
  getMySubscriptionHistory(): Observable<UserSubscription[]> {
    const userId = this.getUserId();
    return this.http.get<UserSubscription[]>(`${this.userSubUrl}/user/${userId}/history`);
  }

  // PATCH /api/user-subscriptions/user/:userId/cancel
  cancelSubscription(): Observable<void> {
    const userId = this.getUserId();
    return this.http.patch<void>(`${this.userSubUrl}/user/${userId}/cancel`, {});
  }

  // POST /api/user-subscriptions/user/:userId/renew
  renewSubscription(): Observable<UserSubscription> {
    const userId = this.getUserId();
    return this.http.post<UserSubscription>(`${this.userSubUrl}/user/${userId}/renew`, {});
  }

  // PATCH /api/user-subscriptions/user/:userId/auto-renew?autoRenew=true/false
  setAutoRenew(autoRenew: boolean): Observable<void> {
    const userId = this.getUserId();
    return this.http.patch<void>(
      `${this.userSubUrl}/user/${userId}/auto-renew`,
      {},
      { params: { autoRenew: String(autoRenew) } }
    );
  }

  /** @deprecated Use setAutoRenew(boolean) instead */
  toggleAutoRenew(userSubscriptionId: number): Observable<void> {
    return this.setAutoRenew(false);
  }
}