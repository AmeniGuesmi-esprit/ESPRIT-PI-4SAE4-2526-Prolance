import { Component, OnInit } from '@angular/core';
import { Subscription } from '../../../models/subscription.model';
import { SubscriptionService } from '../../../services/subscription.service';

@Component({
  selector: 'app-subscription-stats',
  templateUrl: './subscription-stats.component.html',
  styleUrls: ['./subscription-stats.component.scss'],
})
export class SubscriptionStatsComponent implements OnInit {
  subscriptions: Subscription[] = [];
  loading: boolean = false;

  // KPIs
  totalSubscribers: number = 0;
  monthlyRevenue: number = 0;
  cancellationRate: number = 0;
  growthRate: number = 0;
  popularPlan: string = '';
  popularPlanPercentage: number = 0;
  avgRevenuePerUser: number = 0;

  // Animated KPIs
  animatedSubscribers: number = 0;
  animatedRevenue: number = 0;
  animatedCancellation: number = 0;
  animatedGrowth: number = 0;
  animatedARPU: number = 0;

  // Chart data
  planChartData: { name: string; subscribers: number; color: string; gradient: string; percentage: number }[] = [];
  freelancerPercentage: number = 0;
  clientPercentage: number = 0;
  freelancerCount: number = 0;
  clientCount: number = 0;

  // Revenue table
  revenueData: { name: string; type: string; subscribers: number; price: number; totalRevenue: number; share: number }[] = [];
  totalRevenue: number = 0;

  // Monthly trend (simulated)
  monthlyTrend: { month: string; revenue: number; subscribers: number }[] = [];

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.subscriptionService.getAllSubscriptions().subscribe(
      (data: Subscription[]) => {
        this.subscriptions = data.filter((s) => s.isActive);
        this.calculateStats();
        this.loading = false;

        // Start counter animations after a short delay
        setTimeout(() => this.animateCounters(), 300);
      },
      (error) => {
        console.error('Error:', error);
        this.loading = false;
      }
    );
  }

  calculateStats(): void {
    // Total subscribers
    this.totalSubscribers = this.subscriptions.reduce(
      (sum, s) => sum + (s.activeSubscribersCount || 0), 0
    );

    // Monthly revenue
    this.monthlyRevenue = this.subscriptions.reduce(
      (sum, s) => sum + (s.price * (s.activeSubscribersCount || 0)), 0
    );
    this.monthlyRevenue = Math.round(this.monthlyRevenue * 100) / 100;

    // Simulated rates
    this.cancellationRate = 5.2;
    this.growthRate = 18.7;

    // ARPU
    this.avgRevenuePerUser = this.totalSubscribers > 0
      ? Math.round((this.monthlyRevenue / this.totalSubscribers) * 100) / 100
      : 0;

    // Popular plan
    const sorted = [...this.subscriptions].sort(
      (a, b) => (b.activeSubscribersCount || 0) - (a.activeSubscribersCount || 0)
    );
    if (sorted.length > 0) {
      this.popularPlan = sorted[0].name;
      this.popularPlanPercentage = this.totalSubscribers > 0
        ? Math.round(((sorted[0].activeSubscribersCount || 0) / this.totalSubscribers) * 100)
        : 0;
    }

    // Chart data with gradients
    const colorSets = [
      { color: '#7c5cfc', gradient: 'linear-gradient(180deg, #7c5cfc, #5b3fd9)' },
      { color: '#00d4ff', gradient: 'linear-gradient(180deg, #00d4ff, #0099cc)' },
      { color: '#ff9f43', gradient: 'linear-gradient(180deg, #ff9f43, #e67e22)' },
      { color: '#00e676', gradient: 'linear-gradient(180deg, #00e676, #00b359)' },
      { color: '#fd79a8', gradient: 'linear-gradient(180deg, #fd79a8, #e84393)' },
      { color: '#ff5370', gradient: 'linear-gradient(180deg, #ff5370, #d63031)' },
    ];

    const maxSubs = Math.max(...this.subscriptions.map(s => s.activeSubscribersCount || 0), 1);
    this.planChartData = this.subscriptions.map((s, i) => ({
      name: s.name,
      subscribers: s.activeSubscribersCount || 0,
      color: colorSets[i % colorSets.length].color,
      gradient: colorSets[i % colorSets.length].gradient,
      percentage: Math.round(((s.activeSubscribersCount || 0) / maxSubs) * 100),
    }));

    // Distribution by type
    this.freelancerCount = this.subscriptions
      .filter((s) => s.type === 'FREELANCER')
      .reduce((sum, s) => sum + (s.activeSubscribersCount || 0), 0);
    this.clientCount = this.subscriptions
      .filter((s) => s.type === 'CLIENT')
      .reduce((sum, s) => sum + (s.activeSubscribersCount || 0), 0);

    this.freelancerPercentage = this.totalSubscribers > 0
      ? Math.round((this.freelancerCount / this.totalSubscribers) * 100)
      : 50;
    this.clientPercentage = 100 - this.freelancerPercentage;

    // Revenue table
    this.totalRevenue = this.monthlyRevenue;
    this.revenueData = sorted
      .filter((s) => (s.activeSubscribersCount || 0) > 0)
      .map((s) => {
        const rev = Math.round(s.price * (s.activeSubscribersCount || 0) * 100) / 100;
        return {
          name: s.name,
          type: s.type,
          subscribers: s.activeSubscribersCount || 0,
          price: s.price,
          totalRevenue: rev,
          share: this.totalRevenue > 0 ? Math.round((rev / this.totalRevenue) * 100) : 0,
        };
      });

    // Monthly trend (simulated realistic data)
    this.monthlyTrend = [
      { month: 'Sep', revenue: Math.round(this.monthlyRevenue * 0.62), subscribers: Math.round(this.totalSubscribers * 0.55) },
      { month: 'Oct', revenue: Math.round(this.monthlyRevenue * 0.71), subscribers: Math.round(this.totalSubscribers * 0.65) },
      { month: 'Nov', revenue: Math.round(this.monthlyRevenue * 0.78), subscribers: Math.round(this.totalSubscribers * 0.74) },
      { month: 'Dec', revenue: Math.round(this.monthlyRevenue * 0.85), subscribers: Math.round(this.totalSubscribers * 0.82) },
      { month: 'Jan', revenue: Math.round(this.monthlyRevenue * 0.93), subscribers: Math.round(this.totalSubscribers * 0.91) },
      { month: 'Feb', revenue: this.monthlyRevenue, subscribers: this.totalSubscribers },
    ];
  }

  animateCounters(): void {
    this.animateValue('animatedSubscribers', this.totalSubscribers, 1200);
    this.animateValue('animatedRevenue', this.monthlyRevenue, 1400);
    this.animateValue('animatedCancellation', this.cancellationRate, 800, true);
    this.animateValue('animatedGrowth', this.growthRate, 1000, true);
    this.animateValue('animatedARPU', this.avgRevenuePerUser, 1000, true);
  }

  private animateValue(property: string, target: number, duration: number, isDecimal: boolean = false): void {
    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      (this as any)[property] = isDecimal ? Math.round(current * 10) / 10 : Math.round(current);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  getBarHeight(subscribers: number): number {
    const max = Math.max(...this.planChartData.map((d) => d.subscribers), 1);
    return (subscribers / max) * 180;
  }

  getTrendBarHeight(revenue: number): number {
    const max = Math.max(...this.monthlyTrend.map(d => d.revenue), 1);
    return (revenue / max) * 140;
  }
}