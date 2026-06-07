import { Component, OnInit, OnDestroy } from '@angular/core';
import { StatsService, PlatformStats } from '../../../services/Stats.service';
import { RoleService } from '../../../services/role.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  trigger,
  transition,
  style,
  animate,
  stagger,
  query,
} from '@angular/animations';

@Component({
  selector: 'app-subscription-stats',
  templateUrl: './subscription-stats.component.html',
  styleUrls: ['./subscription-stats.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(24px)' }),
        animate('600ms cubic-bezier(0.23, 1, 0.32, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('staggerItems', [
      transition(':enter', [
        query('.stat-card, .testimonial-card, .feature-item', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger(100, [
            animate('500ms cubic-bezier(0.23, 1, 0.32, 1)',
              style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class SubscriptionStatsComponent implements OnInit, OnDestroy {
  stats: PlatformStats | null = null;
  loading = true;
  selectedType: 'FREELANCER' | 'CLIENT' = 'FREELANCER';

  displayUsers = 0;
  displayFreelancers = 0;
  displayClients = 0;
  displayProjects = 0;
  displaySatisfaction = 0;
  displayActiveSubscriptions = 0;

  planBars: { name: string; count: number; percent: number; color: string }[] = [];

  testimonials = [
    {
      name: 'Sarra B.',
      role: 'Full-Stack Developer',
      type: 'FREELANCER',
      text: 'Thanks to Prolance, I tripled my income in 6 months. The Pro plan gave me incredible visibility!',
      rating: 5,
      avatar: 'S',
    },
    {
      name: 'Ahmed K.',
      role: 'CEO - TechStart',
      type: 'CLIENT',
      text: 'We found our mobile developer in 48 hours. The AI matching on the Premium plan is truly effective.',
      rating: 5,
      avatar: 'A',
    },
    {
      name: 'Youssef M.',
      role: 'UX/UI Designer',
      type: 'FREELANCER',
      text: 'Priority support and analytics help me optimize my proposals every week.',
      rating: 5,
      avatar: 'Y',
    },
    {
      name: 'Leila T.',
      role: 'HR Manager - DigitalCorp',
      type: 'CLIENT',
      text: 'Prolance has revolutionized our freelance recruitment process. Essential for our team.',
      rating: 5,
      avatar: 'L',
    },
  ];

  filteredTestimonials: typeof this.testimonials = [];

  private roleSub!: Subscription;

  constructor(
    private statsService: StatsService,
    private roleService: RoleService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.roleSub = this.roleService.currentRole$.subscribe((role) => {
      this.selectedType = role.toUpperCase() as 'FREELANCER' | 'CLIENT';
      this.filterTestimonials();
    });
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
  }

  loadStats(): void {
    this.loading = true;
    this.statsService.getPlatformStats().subscribe(
      (data) => {
        this.stats = data;
        this.loading = false;
        this.animateCounters();
        this.buildPlanBars();
        this.filterTestimonials();
      },
      () => {
        this.loading = false;
        this.stats = {
          totalUsers: 2847,
          totalFreelancers: 1923,
          totalClients: 924,
          activeSubscriptions: 1456,
          mostPopularPlan: 'Pro',
          planDistribution: { 'Basic': 420, 'Pro': 780, 'Elite': 256 },
          totalPlans: 6,
          satisfactionRate: 96,
          avgResponseTime: 2.4,
          projectsCompleted: 8541,
          totalRevenue: 262080,
        };
        this.animateCounters();
        this.buildPlanBars();
        this.filterTestimonials();
      }
    );
  }

  filterTestimonials(): void {
    this.filteredTestimonials = this.testimonials.filter(
      (t) => t.type === this.selectedType
    );
  }

  private animateCounters(): void {
    if (!this.stats) return;
    this.animateValue('displayUsers', this.stats.totalUsers, 2000);
    this.animateValue('displayFreelancers', this.stats.totalFreelancers, 1800);
    this.animateValue('displayClients', this.stats.totalClients, 1800);
    this.animateValue('displayProjects', this.stats.projectsCompleted, 2200);
    this.animateValue('displaySatisfaction', this.stats.satisfactionRate, 1500);
    this.animateValue('displayActiveSubscriptions', this.stats.activeSubscriptions, 1800);
  }

  private animateValue(prop: string, target: number, duration: number): void {
    const start = 0;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      (this as any)[prop] = Math.round(start + (target - start) * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  private buildPlanBars(): void {
    if (!this.stats?.planDistribution) return;
    const dist = this.stats.planDistribution;
    const maxCount = Math.max(...Object.values(dist), 1);
    const colors = ['#06b6d4', '#4f46e5', '#7c3aed', '#f59e0b', '#10b981', '#ef4444'];

    this.planBars = Object.entries(dist).map(([name, count], i) => ({
      name,
      count,
      percent: Math.round((count / maxCount) * 100),
      color: colors[i % colors.length],
    }));
  }

  getStarArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  goToPlans(): void {
    this.router.navigate(['/app/subscription/plans']);
  }
}