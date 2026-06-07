import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { Subscription } from '../../../models/subscription.model';
import { PaymentService } from '../../../services/payment.service';

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss'],
})
export class ConfirmModalComponent implements OnChanges {
  @Input() plan: Subscription | null = null;
  @Input() selectedType: string = 'FREELANCER';
  @Input() isVisible: boolean = false;

  @Output() confirmed = new EventEmitter<{
    plan: Subscription;
    autoRenew: boolean;
    transactionId: string;
    paymentMethod: string;
    amountPaid: number;
    promoCode: string;
  }>();
  @Output() cancelled = new EventEmitter<void>();

  autoRenew = true;
  isProcessing = false;

  promoCode = '';
  promoMessage = '';
  promoValid = false;
  promoLoading = false;
  discountPercent = 0;

  cardNumber = '';
  cardExpiry = '';
  cardCvc = '';
  cardName = '';

  step: 'review' | 'payment' = 'review';

  constructor(private paymentService: PaymentService) {}

  ngOnChanges(): void {
    if (this.isVisible) {
      this.resetState();
    }
  }

  private resetState(): void {
    this.step = 'review';
    this.promoCode = '';
    this.promoMessage = '';
    this.promoValid = false;
    this.discountPercent = 0;
    this.isProcessing = false;
    this.promoLoading = false;
    this.cardNumber = '';
    this.cardExpiry = '';
    this.cardCvc = '';
    this.cardName = '';
  }

  get subtotal(): number {
    return this.plan?.price || 0;
  }

  get discountAmount(): number {
    return Math.round(this.subtotal * this.discountPercent) / 100;
  }

  get subtotalAfterDiscount(): number {
    return Math.round((this.subtotal - this.discountAmount) * 100) / 100;
  }

  get tva(): number {
    return Math.round(this.subtotalAfterDiscount * 0.19 * 100) / 100;
  }

  get total(): number {
    return Math.round((this.subtotalAfterDiscount + this.tva) * 100) / 100;
  }

  getDuration(): string {
    if (!this.plan) return '';
    return this.plan.billingCycle === 'SEMESTRIELLE' ? '6 months' : '12 months';
  }

  getTypeName(): string {
    return this.selectedType === 'CLIENT' ? 'Client' : 'Freelancer';
  }

  getFeaturesSummary(): string[] {
    if (!this.plan) return [];
    const features: string[] = [];
    if (this.plan.maxProjects) {
      features.push(
        (this.plan.maxProjects ?? 0) >= 999
          ? 'Unlimited projects'
          : `${this.plan.maxProjects} projects`
      );
    }
    if (this.plan.maxProposals) {
      features.push(
        (this.plan.maxProposals ?? 0) >= 999
          ? 'Unlimited proposals'
          : `${this.plan.maxProposals} proposals`
      );
    }
    if (this.plan.prioritySupport) features.push('Priority support');
    if (this.plan.analyticsAccess) features.push('Analytics');
    return features;
  }

  validatePromo(): void {
    if (!this.promoCode.trim()) return;
    this.promoLoading = true;
    this.promoMessage = '';
    this.paymentService.validatePromoCode(this.promoCode.trim()).subscribe(
      (res) => {
        this.promoLoading = false;
        this.promoValid = res.valid;
        this.promoMessage = res.message;
        if (res.valid && res.discountPercent) {
          this.discountPercent = res.discountPercent;
        } else {
          this.discountPercent = 0;
        }
      },
      () => {
        this.promoLoading = false;
        this.promoMessage = 'Connection error';
        this.promoValid = false;
      }
    );
  }

  removePromo(): void {
    this.promoCode = '';
    this.promoMessage = '';
    this.promoValid = false;
    this.discountPercent = 0;
  }

  goToPayment(): void {
    this.step = 'payment';
  }

  goBackToReview(): void {
    this.step = 'review';
  }

  formatCardNumber(): void {
    let raw = this.cardNumber.replace(/\D/g, '').substring(0, 16);
    this.cardNumber = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  formatExpiry(): void {
    let raw = this.cardExpiry.replace(/\D/g, '').substring(0, 4);
    if (raw.length >= 3) {
      this.cardExpiry = raw.substring(0, 2) + '/' + raw.substring(2);
    } else {
      this.cardExpiry = raw;
    }
  }

  formatCvc(): void {
    this.cardCvc = this.cardCvc.replace(/\D/g, '').substring(0, 3);
  }

  get isCardValid(): boolean {
    const num = this.cardNumber.replace(/\s/g, '');
    return (
      num.length === 16 &&
      this.cardExpiry.length === 5 &&
      this.cardCvc.length === 3 &&
      this.cardName.trim().length >= 2
    );
  }

  onPay(): void {
    if (!this.plan || this.isProcessing || !this.isCardValid) return;
    this.isProcessing = true;
    if (this.promoValid && this.promoCode) {
      this.paymentService.applyPromoCode(this.promoCode).subscribe();
    }
    this.paymentService
      .simulatePayment({
        amount: this.total,
        planName: this.plan.name,
        userId: 1,
      })
      .subscribe(
        (paymentRes) => {
          if (paymentRes.success) {
            this.confirmed.emit({
              plan: this.plan!,
              autoRenew: this.autoRenew,
              transactionId: paymentRes.transactionId,
              paymentMethod: paymentRes.paymentMethod,
              amountPaid: this.total,
              promoCode: this.promoValid ? this.promoCode : '',
            });
          } else {
            alert('Payment failed. Please try again.');
          }
          this.isProcessing = false;
        },
        () => {
          alert('Connection error to payment server.');
          this.isProcessing = false;
        }
      );
  }

  onCancel(): void {
    if (!this.isProcessing) {
      this.cancelled.emit();
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onCancel();
    }
  }
}