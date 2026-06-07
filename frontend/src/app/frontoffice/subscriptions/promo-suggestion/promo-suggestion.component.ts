import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { trigger, transition, style, animate, stagger, query } from '@angular/animations';
import { PromoService } from '../../../services/promo.service';
import { PromoRecommendation } from '../../../models/promo.model';

@Component({
  selector: 'app-promo-suggestion',
  templateUrl: './promo-suggestion.component.html',
  styleUrls: ['./promo-suggestion.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('staggerPromos', [
      transition(':enter', [
        query('.promo-card', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(150, [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class PromoSuggestionComponent implements OnInit {
  @Input() userType: 'FREELANCER' | 'CLIENT' = 'FREELANCER';
  @Input() planTier?: string;
  @Input() userId?: number;
  @Output() promoSelected = new EventEmitter<PromoRecommendation>();

  recommendations: PromoRecommendation[] = [];
  loading = true;
  isExpanded = false;
  selectedPromo: PromoRecommendation | null = null;
  copiedCode: string | null = null;

  constructor(private promoService: PromoService) {}

  ngOnInit(): void {
    this.loadRecommendations();
  }

  loadRecommendations(): void {
    this.loading = true;
    this.promoService.getAIRecommendations(this.userType, this.planTier, this.userId)
      .subscribe({
        next: (response) => {
          this.recommendations = response.recommendations;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  selectPromo(promo: PromoRecommendation): void {
    this.selectedPromo = promo;
    this.promoSelected.emit(promo);
  }

  copyCode(code: string, event: Event): void {
    event.stopPropagation();
    navigator.clipboard.writeText(code);
    this.copiedCode = code;
    setTimeout(() => this.copiedCode = null, 2000);
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#6366f1';
  }

  getUrgencyLabel(promo: PromoRecommendation): string | null {
    if (promo.remainingUses <= 10) return `🔥 ${promo.remainingUses} restants`;
    
    if (promo.expiresAt) {
      const days = Math.ceil((new Date(promo.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days <= 7) return `⏰ ${days}j restants`;
    }
    return null;
  }

  formatDiscount(percent: number): string {
    return `-${percent}%`;
  }
}