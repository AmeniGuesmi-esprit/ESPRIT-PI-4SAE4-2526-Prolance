import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription as RxSubscription } from 'rxjs';
import { Subscription } from '../../../models/subscription.model';
import { SubscriptionService } from '../../../services/subscription.service';
import { RoleService } from '../../../services/role.service';
import { PaymentService } from '../../../services/payment.service';
import { PromoRecommendation } from '../../../models/promo.model';
import {
  trigger,
  transition,
  style,
  animate,
  stagger,
  query,
} from '@angular/animations';

@Component({
  selector: 'app-plans-catalog',
  templateUrl: './plans-catalog.component.html',
  styleUrls: ['./plans-catalog.component.scss'],
  animations: [
    trigger('staggerCards', [
      transition(':enter', [
        query(
          '.plan-card',
          [
            style({ opacity: 0, transform: 'translateY(40px) scale(0.95)' }),
            stagger(120, [
              animate(
                '500ms cubic-bezier(0.23, 1, 0.32, 1)',
                style({ opacity: 1, transform: 'translateY(0) scale(1)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '400ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
  ],
})
export class PlansCatalogComponent implements OnInit, OnDestroy {
  plans: Subscription[] = [];
  filteredPlans: Subscription[] = [];
  selectedType: 'FREELANCER' | 'CLIENT' = 'FREELANCER';
  billingCycle: 'SEMESTRIELLE' | 'ANNUELLE' = 'SEMESTRIELLE';
  loading = false;
  errorMessage = '';
  showModal = false;
  selectedPlan: Subscription | null = null;
  showComparison = false;

  showSuccess = false;
  successPlanName = '';
  successPlanTier: 'starter' | 'pro' | 'elite' = 'starter';
  lastSubscriptionId: number | null = null;

  selectedPromoCode: string = '';

  private roleSub!: RxSubscription;

  constructor(
    private subscriptionService: SubscriptionService,
    private roleService: RoleService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.roleSub = this.roleService.currentRole$.subscribe((role) => {
      this.selectedType = role.toUpperCase() as 'FREELANCER' | 'CLIENT';
      this.loadPlans();
    });
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
  }

  loadPlans(): void {
    this.loading = true;
    this.errorMessage = '';

    this.subscriptionService.getSubscriptionsByType(this.selectedType).subscribe(
      (data: Subscription[]) => {
        this.plans = data.filter((p) => p.isActive);
        this.filterPlans();
        this.loading = false;
      },
      (error) => {
        console.error('Error loading plans:', error);
        this.errorMessage = 'Unable to load plans. Please check your connection.';
        this.plans = [];
        this.filteredPlans = [];
        this.loading = false;
      }
    );
  }

  setBillingCycle(cycle: 'SEMESTRIELLE' | 'ANNUELLE'): void {
    this.billingCycle = cycle;
    this.filterPlans();
  }

  filterPlans(): void {
    this.filteredPlans = this.plans.filter((p) => p.billingCycle === this.billingCycle);
  }

  toggleComparison(): void {
    this.showComparison = !this.showComparison;
  }

  getFeatures(plan: Subscription): { text: string; highlight: boolean }[] {
    const features: { text: string; highlight: boolean }[] = [];

    if (this.selectedType === 'CLIENT') {
      if (plan.maxProjects)
        features.push({
          text: plan.maxProjects >= 999 ? 'Unlimited listings' : `${plan.maxProjects} job listings`,
          highlight: (plan.maxProjects ?? 0) >= 999,
        });
      if (plan.maxProposals)
        features.push({
          text: plan.maxProposals >= 999 ? 'Unlimited proposals' : `${plan.maxProposals} proposals`,
          highlight: (plan.maxProposals ?? 0) >= 999,
        });
      if (plan.featuredListing) features.push({ text: 'Advanced AI Matching', highlight: true });
      if (plan.maxActiveJobs)
        features.push({
          text: plan.maxActiveJobs >= 999 ? 'Multi-user team' : `${plan.maxActiveJobs} active recruitments`,
          highlight: false,
        });
      if (plan.analyticsAccess) features.push({ text: 'Analytics dashboard', highlight: true });
      features.push({
        text: plan.prioritySupport ? 'Priority support 24/7' : 'Email support',
        highlight: plan.prioritySupport,
      });
      if (plan.maxProjects && plan.maxProjects >= 999) {
        features.push({ text: 'API access', highlight: true });
        features.push({ text: 'Dedicated manager', highlight: true });
      }
    } else {
      if (plan.maxProjects)
        features.push({
          text: plan.maxProjects >= 999 ? 'Unlimited projects' : `${plan.maxProjects} max projects`,
          highlight: (plan.maxProjects ?? 0) >= 999,
        });
      if (plan.maxProposals)
        features.push({
          text: plan.maxProposals >= 999 ? 'Unlimited proposals' : `${plan.maxProposals} proposals/month`,
          highlight: (plan.maxProposals ?? 0) >= 999,
        });
      if (plan.maxActiveJobs)
        features.push({ text: `${plan.maxActiveJobs} concurrent active jobs`, highlight: false });
      features.push({
        text: plan.featuredListing ? 'Featured profile' : 'Standard profile',
        highlight: plan.featuredListing,
      });
      features.push({
        text: plan.prioritySupport ? 'Priority support' : 'Email support',
        highlight: plan.prioritySupport,
      });
      if (plan.analyticsAccess)
        features.push({ text: 'Analytics & statistics', highlight: true });
    }
    return features;
  }

  getDuration(plan: Subscription): string {
    return plan.billingCycle === 'SEMESTRIELLE' ? '6 months' : 'year';
  }

  getMonthlyPrice(plan: Subscription): string {
    const months = plan.billingCycle === 'SEMESTRIELLE' ? 6 : 12;
    return (plan.price / months).toFixed(1);
  }

  isPopular(plan: Subscription): boolean {
    return plan.name === 'Pro' || plan.name === 'Business' || plan.name === 'Freelance Pro' || plan.name === 'Premium';
  }

  getPlanTier(plan: Subscription): 'starter' | 'pro' | 'elite' {
    const n = plan.name.toLowerCase();
    if (n.includes('elite') || n.includes('enterprise')) return 'elite';
    if (n.includes('pro') || n.includes('premium') || n.includes('business')) return 'pro';
    return 'starter';
  }

  getPlanIcon(plan: Subscription): string {
    const tier = this.getPlanTier(plan);
    if (tier === 'starter') return '🚀';
    if (tier === 'pro') return '⚡';
    return '👑';
  }

  getSavingsPercent(plan: Subscription): number | null {
    if (plan.billingCycle !== 'ANNUELLE') return null;
    const semPlan = this.plans.find((p) => p.name === plan.name && p.billingCycle === 'SEMESTRIELLE');
    if (!semPlan) return null;
    const annualFromSem = semPlan.price * 2;
    if (annualFromSem <= plan.price) return null;
    return Math.round(((annualFromSem - plan.price) / annualFromSem) * 100);
  }

  onSubscribe(plan: Subscription): void {
    this.selectedPlan = plan;
    this.showModal = true;
  }

  onModalConfirmed(event: {
    plan: Subscription;
    autoRenew: boolean;
    transactionId: string;
    paymentMethod: string;
    amountPaid: number;
    promoCode: string;
  }): void {
    this.showModal = false;
    this.selectedPlan = null;

    this.subscriptionService
      .subscribe(event.plan.id!, event.autoRenew, event.paymentMethod, event.transactionId, event.amountPaid)
      .subscribe(
        (response: any) => {
          this.successPlanName = event.plan.name;
          this.successPlanTier = this.getPlanTier(event.plan);
          this.lastSubscriptionId = response.id;
          this.showSuccess = true;
        },
        (error) =>
          alert('❌ Error: ' + (error.error?.message || 'Unable to subscribe.'))
      );
  }

  onModalCancelled(): void {
    this.showModal = false;
    this.selectedPlan = null;
  }

  onSuccessClosed(): void {
    this.showSuccess = false;
  }

  downloadInvoice(): void {
    if (!this.lastSubscriptionId) return;
    this.paymentService.downloadInvoice(this.lastSubscriptionId).subscribe(
      (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-prolance-${this.lastSubscriptionId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      () => alert('❌ Error downloading the invoice.')
    );
  }

  onPromoSelected(promo: PromoRecommendation): void {
    this.selectedPromoCode = promo.code;
    // Peut être passé au modal de confirmation
    console.log('Promo sélectionné:', promo.code);
  }
}