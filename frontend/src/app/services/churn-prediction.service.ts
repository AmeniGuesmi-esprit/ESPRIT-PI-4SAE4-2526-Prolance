import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChurnFactor {
  name: string;
  description: string;
  impact: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ChurnPrediction {
  userSubscriptionId: number;
  userId: number;
  userName: string;
  userEmail: string;
  planName: string;
  planType: string;
  billingCycle: string;
  amountPaid: number;

  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  daysRemaining: number;

  currentProjects: number;
  maxProjects: number;
  currentProposals: number;
  maxProposals: number;
  projectsUsagePercent: number;
  proposalsUsagePercent: number;

  churnScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: ChurnFactor[];
  aiSummary: string;
  suggestedAction: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChurnPredictionService {
  private apiUrl = 'http://localhost:8222/api/churn-prediction';

  constructor(private http: HttpClient) {}

  getAllPredictions(): Observable<ChurnPrediction[]> {
    return this.http.get<ChurnPrediction[]>(this.apiUrl);
  }

  getHighRiskPredictions(): Observable<ChurnPrediction[]> {
    return this.http.get<ChurnPrediction[]>(`${this.apiUrl}/high-risk`);
  }

  getPrediction(userSubscriptionId: number): Observable<ChurnPrediction> {
    return this.http.get<ChurnPrediction>(`${this.apiUrl}/${userSubscriptionId}`);
  }
}