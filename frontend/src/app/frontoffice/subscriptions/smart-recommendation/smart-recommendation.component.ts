import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import {
  trigger,
  transition,
  style,
  animate,
  stagger,
  query,
  state,
} from '@angular/animations';
import { RecommendationAIService } from '../../../services/recommendation-ai.service';
import {
  AIRecommendation,
  RecommendationFactor,
  SimilarUser,
} from '../../../models/recommendation-ai.model';

@Component({
  selector: 'app-smart-recommendation',
  templateUrl: './smart-recommendation.component.html',
  styleUrls: ['./smart-recommendation.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('400ms 200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('500ms 300ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
          style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
    trigger('staggerFactors', [
      transition(':enter', [
        query('.factor-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
    trigger('pulse', [
      state('active', style({ transform: 'scale(1)' })),
      state('pulse', style({ transform: 'scale(1.05)' })),
      transition('active <=> pulse', animate('600ms ease-in-out')),
    ]),
  ],
})
export class SmartRecommendationComponent implements OnInit, OnChanges {
  @Input() currentPlanName = '';
  @Input() userType: 'FREELANCER' | 'CLIENT' = 'FREELANCER';
  @Input() userId?: number;

  // Data
  recommendation: AIRecommendation | null = null;
  similarUsers: SimilarUser[] = [];

  // UI State
  loading = true;
  analyzing = true;
  showDetails = false;
  showPeerComparison = false;
  activeFactorIndex: number | null = null;
  pulseState = 'active';

  // Analysis animation
  analysisSteps = [
    { icon: '🔍', label: 'Analyse du profil utilisateur...', done: false },
    { icon: '🧠', label: 'Génération des embeddings...', done: false },
    { icon: '👥', label: 'Recherche de profils similaires...', done: false },
    { icon: '📊', label: 'Calcul des métriques...', done: false },
    { icon: '🤖', label: 'Génération de la recommandation IA...', done: false },
  ];
  currentStep = 0;

  // Animated score
  displayScore = 0;
  displayROI = 0;

  constructor(
    private recommendationService: RecommendationAIService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.startAnalysis();
    this.startPulseAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPlanName'] && !changes['currentPlanName'].firstChange) {
      this.startAnalysis();
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  ANALYSIS FLOW
  // ═══════════════════════════════════════════════════════════

  startAnalysis(): void {
    this.loading = true;
    this.analyzing = true;
    this.currentStep = 0;
    this.displayScore = 0;
    this.displayROI = 0;
    this.showDetails = false;
    this.recommendation = null;

    // Reset steps
    this.analysisSteps.forEach(s => s.done = false);

    // Simulate step-by-step analysis
    this.simulateAnalysisSteps();

    // Fetch real recommendation (or demo)
    this.recommendationService
      .getDemoRecommendation(this.currentPlanName, this.userType)
      .subscribe(rec => {
        this.recommendation = rec;
        this.loading = false;

        // Animate scores after loading
        setTimeout(() => {
          this.analyzing = false;
          this.animateScore(rec.confidenceScore);
          if (rec.projectedBenefits?.estimatedROI) {
            this.animateROI(rec.projectedBenefits.estimatedROI);
          }
        }, 500);
      });
  }

  private simulateAnalysisSteps(): void {
    const stepInterval = 450;
    this.analysisSteps.forEach((step, i) => {
      setTimeout(() => {
        this.currentStep = i;
        step.done = true;
      }, stepInterval * (i + 1));
    });
  }

  refreshRecommendation(): void {
    this.recommendationService.clearCache();
    this.startAnalysis();
  }

  // ═══════════════════════════════════════════════════════════
  //  ANIMATIONS
  // ═══════════════════════════════════════════════════════════

  private animateScore(target: number): void {
    const duration = 1500;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutExpo(progress);
      this.displayScore = Math.round(target * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  private animateROI(target: number): void {
    const duration = 1800;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutExpo(progress);
      this.displayROI = Math.round(target * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  private easeOutExpo(x: number): number {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
  }

  private startPulseAnimation(): void {
    setInterval(() => {
      this.pulseState = this.pulseState === 'active' ? 'pulse' : 'active';
    }, 2000);
  }

  // ═══════════════════════════════════════════════════════════
  //  UI INTERACTIONS
  // ═══════════════════════════════════════════════════════════

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  togglePeerComparison(): void {
    this.showPeerComparison = !this.showPeerComparison;
  }

  setActiveFactor(index: number | null): void {
    this.activeFactorIndex = index;
  }

  goToPlans(): void {
    this.trackAction('clicked');
    this.router.navigate(['/app/subscription/plans']);
  }

  goToUpgrade(): void {
    this.trackAction('clicked');
    if (this.recommendation) {
      this.router.navigate(['/app/subscription/plans'], {
        queryParams: { recommended: this.recommendation.recommendedTier }
      });
    }
  }

  dismissRecommendation(): void {
    this.trackAction('dismissed');
    // Logique pour cacher temporairement
  }

  private trackAction(action: 'viewed' | 'clicked' | 'dismissed'): void {
    // Track via le service
    console.log('Tracking action:', action);
  }

  // ═══════════════════════════════════════════════════════════
  //  COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════

  getScoreColor(): string {
    if (!this.recommendation) return '#6366f1';
    const score = this.recommendation.confidenceScore;
    if (score >= 80) return '#ef4444'; // Rouge - très recommandé
    if (score >= 60) return '#f59e0b'; // Orange
    if (score >= 40) return '#6366f1'; // Violet
    return '#10b981'; // Vert - optimal
  }

  getScoreGradient(): string {
    const color = this.getScoreColor();
    return `conic-gradient(${color} ${this.displayScore * 3.6}deg, #e5e7eb 0deg)`;
  }

  getUrgencyClass(): string {
    return this.recommendation?.urgencyLevel || 'low';
  }

  getUrgencyLabel(): string {
    const labels: Record<string, string> = {
      low: 'Faible',
      medium: 'Modérée',
      high: 'Élevée',
      critical: 'Critique'
    };
    return labels[this.recommendation?.urgencyLevel || 'low'];
  }

  getFactorImpactClass(impact: string): string {
    return impact === 'positive' ? 'positive' : impact === 'negative' ? 'negative' : 'neutral';
  }

  getTrendIcon(trend: string): string {
    const icons: Record<string, string> = {
      up: '↑',
      down: '↓',
      stable: '→'
    };
    return icons[trend] || '→';
  }

  getCircumference(): number {
    return 2 * Math.PI * 54; // radius = 54
  }

  getScoreOffset(): number {
    const circumference = this.getCircumference();
    return circumference - (circumference * this.displayScore) / 100;
  }
}