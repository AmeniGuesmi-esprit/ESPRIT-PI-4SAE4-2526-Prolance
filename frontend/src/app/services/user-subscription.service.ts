import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserSubscription } from '../models/user-subscription.model';

@Injectable({
  providedIn: 'root'
})
export class UserSubscriptionService {

  private apiUrl = 'http://localhost:8089/pidev/api/user-subscriptions';

  constructor(private http: HttpClient) {}

  // GET — Mon abonnement actuel
  getMySubscription(): Observable<UserSubscription> {
    return this.http.get<UserSubscription>(`${this.apiUrl}/my-subscription`);
  }

  // GET — Tous les abonnements utilisateurs (Admin)
  getAllUserSubscriptions(): Observable<UserSubscription[]> {
    return this.http.get<UserSubscription[]>(this.apiUrl);
  }

  // GET — Abonnement par ID
  getUserSubscriptionById(id: number): Observable<UserSubscription> {
    return this.http.get<UserSubscription>(`${this.apiUrl}/${id}`);
  }

  // POST — S'abonner à un plan
  subscribe(subscriptionId: number, paymentMethod: string): Observable<UserSubscription> {
    return this.http.post<UserSubscription>(`${this.apiUrl}/subscribe`, {
      subscriptionId,
      paymentMethod,
    });
  }

  // PUT — Annuler mon abonnement
  cancelSubscription(id: number): Observable<UserSubscription> {
    return this.http.put<UserSubscription>(`${this.apiUrl}/${id}/cancel`, {});
  }

  // PUT — Toggle renouvellement auto
  toggleAutoRenew(id: number): Observable<UserSubscription> {
    return this.http.put<UserSubscription>(`${this.apiUrl}/${id}/toggle-auto-renew`, {});
  }
}