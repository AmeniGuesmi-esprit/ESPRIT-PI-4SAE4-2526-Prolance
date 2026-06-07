import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl = 'http://localhost:8222/api/payments';
  
  constructor(private http: HttpClient) {}

  validatePromoCode(code: string): Observable<{
    valid: boolean;
    discountPercent?: number;
    description?: string;
    message: string;
  }> {
    return this.http.get<any>(`${this.apiUrl}/promo/validate/${code}`);
  }

  applyPromoCode(code: string): Observable<{
    success: boolean;
    discountPercent?: number;
  }> {
    return this.http.post<any>(`${this.apiUrl}/promo/apply/${code}`, {});
  }

  simulatePayment(data: {
    amount: number;
    planName: string;
    userId: number;
  }): Observable<{
    success: boolean;
    transactionId: string;
    message: string;
    paymentMethod: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/simulate`, data);
  }

  downloadInvoice(userSubscriptionId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/invoice/${userSubscriptionId}`, {
      responseType: 'blob',
    });
  }
}