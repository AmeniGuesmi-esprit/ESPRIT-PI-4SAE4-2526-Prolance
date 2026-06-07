import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PlatformStats {
  totalUsers: number;
  totalFreelancers: number;
  totalClients: number;
  activeSubscriptions: number;
  mostPopularPlan: string;
  planDistribution: Record<string, number>;
  totalPlans: number;
  satisfactionRate: number;
  avgResponseTime: number;
  projectsCompleted: number;
  totalRevenue: number;
}

@Injectable({ providedIn: 'root' })
export class StatsService {

  private apiUrl = 'http://localhost:8222/api/stats';

  constructor(private http: HttpClient) {}

  getPlatformStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.apiUrl}/platform`);
  }
}