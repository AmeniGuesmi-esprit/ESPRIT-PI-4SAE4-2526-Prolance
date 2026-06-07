import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserSubscription } from '../../../models/user-subscription.model';
import { SubscriptionService } from '../../../services/subscription.service';
import { PaymentService } from '../../../services/payment.service';
import {
  trigger,
  transition,
  style,
  animate,
  stagger,
  query,
} from '@angular/animations';

@Component({
  selector: 'app-my-subscription',
  templateUrl: './my-subscription.component.html',
  styleUrls: ['./my-subscription.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate(
          '400ms cubic-bezier(0.23, 1, 0.32, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    trigger('staggerRows', [
      transition(':enter', [
        query(
          '.history-row',
          [
            style({ opacity: 0, transform: 'translateX(-12px)' }),
            stagger(80, [
              animate(
                '300ms ease-out',
                style({ opacity: 1, transform: 'translateX(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
})
export class MySubscriptionComponent implements OnInit {
  currentSubscription: UserSubscription | null = null;
  subscriptionHistory: UserSubscription[] = [];
  loading = false;
  errorMessage = '';
  showCancelConfirm = false;
  renewLoading = false;

  constructor(
    private subscriptionService: SubscriptionService,
    private router: Router,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.loadMySubscription();
    this.loadHistory();
  }

  loadMySubscription(): void {
    this.loading = true;
    this.errorMessage = '';

    this.subscriptionService.getMySubscription().subscribe(
      (data: UserSubscription) => {
        this.currentSubscription = data;
        this.loading = false;
      },
      (error) => {
        console.error('Error:', error);
        if (error.status === 404) {
          this.currentSubscription = null;
        } else {
          this.errorMessage = 'Unable to load your subscription.';
        }
        this.loading = false;
      }
    );
  }

  loadHistory(): void {
    this.subscriptionService.getMySubscriptionHistory().subscribe(
      (data: UserSubscription[]) => {
        this.subscriptionHistory = data;
      },
      (error) => {
        console.error('History error:', error);
      }
    );
  }

  getStatusLabel(status?: string): string {
    const s = status || this.currentSubscription?.status || '';
    const map: Record<string, string> = {
      ACTIVE: 'Active',
      EXPIRED: 'Expired',
      CANCELLED: 'Cancelled',
      SUSPENDED: 'Suspended',
      PENDING_PAYMENT: 'Pending',
    };
    return map[s] || s;
  }

  getStatusClass(status?: string): string {
    const s = status || this.currentSubscription?.status || '';
    const map: Record<string, string> = {
      ACTIVE: 'status-active',
      EXPIRED: 'status-expired',
      CANCELLED: 'status-cancelled',
      SUSPENDED: 'status-suspended',
      PENDING_PAYMENT: 'status-pending',
    };
    return map[s] || '';
  }

  getPlanName(): string {
    return this.currentSubscription?.subscription?.name || '';
  }

  getPlanTypeName(): string {
    if (!this.currentSubscription?.subscription) return '';
    return this.currentSubscription.subscription.type === 'FREELANCER'
      ? 'Freelancer'
      : 'Client';
  }

  getPlanPrice(): string {
    if (!this.currentSubscription?.subscription) return '';
    const sub = this.currentSubscription.subscription;
    const cycle = sub.billingCycle === 'SEMESTRIELLE' ? '6 months' : 'year';
    return `${sub.price} DT / ${cycle}`;
  }

  getDaysRemaining(): number {
    if (!this.currentSubscription) return 0;
    if (
      this.currentSubscription.daysRemaining !== undefined &&
      this.currentSubscription.daysRemaining !== null
    ) {
      return this.currentSubscription.daysRemaining;
    }
    const end = new Date(this.currentSubscription.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getTotalDays(): number {
    if (!this.currentSubscription) return 1;
    const start = new Date(this.currentSubscription.startDate);
    const end = new Date(this.currentSubscription.endDate);
    return Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
  }

  getTimeProgress(): number {
    const total = this.getTotalDays();
    const remaining = this.getDaysRemaining();
    return Math.round(((total - remaining) / total) * 100);
  }

  isExpiringSoon(): boolean {
    if (this.currentSubscription?.isExpiringSoon) return true;
    return this.getDaysRemaining() <= 14 && this.getDaysRemaining() > 0;
  }

  getProjectsUsage(): { current: number; max: number; percent: number } {
    const current = this.currentSubscription?.currentProjects || 0;
    const max = this.currentSubscription?.subscription?.maxProjects || 0;
    const percent = max > 0 ? Math.round((current / max) * 100) : 0;
    return { current, max, percent };
  }

  getProposalsUsage(): { current: number; max: number; percent: number } {
    const current = this.currentSubscription?.currentProposals || 0;
    const max = this.currentSubscription?.subscription?.maxProposals || 0;
    const percent = max > 0 ? Math.round((current / max) * 100) : 0;
    return { current, max, percent };
  }

  formatDate(date: Date | string): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  onChangePlan(): void {
    this.router.navigate(['/app/subscription/plans']);
  }

  // ← NOUVEAU
  onGoToAiRecommendation(): void {
    this.router.navigate(['/app/subscription/ai-recommendation']);
  }

  onToggleAutoRenew(): void {
    if (!this.currentSubscription) return;
    const newValue = !this.currentSubscription.autoRenew;

    this.subscriptionService.setAutoRenew(newValue).subscribe(
      () => {
        if (this.currentSubscription) {
          this.currentSubscription.autoRenew = newValue;
        }
      },
      (error) => {
        alert(
          '❌ Error: ' +
            (error.error?.message || 'Unable to update')
        );
      }
    );
  }

  onRenewSubscription(): void {
    this.renewLoading = true;
    this.subscriptionService.renewSubscription().subscribe(
      (renewed: UserSubscription) => {
        this.currentSubscription = renewed;
        this.renewLoading = false;
        this.loadHistory();
      },
      (error) => {
        alert(
          '❌ Error: ' +
            (error.error?.message || 'Unable to renew')
        );
        this.renewLoading = false;
      }
    );
  }

  onCancelSubscription(): void {
    this.showCancelConfirm = true;
  }

  confirmCancel(): void {
    this.showCancelConfirm = false;
    this.subscriptionService.cancelSubscription().subscribe(
      () => {
        this.loadMySubscription();
        this.loadHistory();
      },
      (error) => {
        alert(
          '❌ Error: ' +
            (error.error?.message || 'Unable to cancel')
        );
      }
    );
  }

  dismissCancel(): void {
    this.showCancelConfirm = false;
  }

  getHistoryPlanName(sub: UserSubscription): string {
    if (!sub.subscription) return '—';
    return `${sub.subscription.name} (${
      sub.subscription.type === 'FREELANCER' ? 'Freelancer' : 'Client'
    })`;
  }

  onDownloadInvoice(): void {
    if (!this.currentSubscription?.id) return;
    this.paymentService.downloadInvoice(this.currentSubscription.id).subscribe(
      (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-prolance-${this.currentSubscription!.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      () => alert('❌ Error downloading the invoice.')
    );
  }
}