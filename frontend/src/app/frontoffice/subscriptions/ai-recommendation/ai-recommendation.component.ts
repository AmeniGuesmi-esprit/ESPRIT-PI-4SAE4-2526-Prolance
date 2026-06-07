import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import {
  RecommendationService,
  PlanRecommendation,
  UsageAnalysis,
} from '../../../services/recommendation.service';
import {
  trigger,
  transition,
  style,
  animate,
  stagger,
  query,
} from '@angular/animations';

@Component({
  selector: 'app-ai-recommendation',
  templateUrl: './ai-recommendation.component.html',
  styleUrls: ['./ai-recommendation.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms 200ms cubic-bezier(0.23, 1, 0.32, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('400ms 400ms ease-out',
          style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
    trigger('staggerReasons', [
      transition(':enter', [
        query('.reason-card', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger(120, [
            animate('400ms cubic-bezier(0.23, 1, 0.32, 1)',
              style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
    trigger('countUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.5)' }),
        animate('600ms 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
  ],
})
export class AiRecommendationComponent implements OnInit, OnChanges {
  @Input() currentPlanName = '';
  @Input() userType: 'FREELANCER' | 'CLIENT' = 'FREELANCER';

  recommendation: PlanRecommendation | null = null;
  usageAnalysis: UsageAnalysis | null = null;
  loading = true;
  analyzing = true;
  showDetails = false;

  // Animated score
  displayScore = 0;
  analysisSteps = [
    { label: 'Analyzing usage patterns...', done: false },
    { label: 'Evaluating conversion metrics...', done: false },
    { label: 'Comparing with similar profiles...', done: false },
    { label: 'Generating recommendation...', done: false },
  ];
  currentStep = 0;

  constructor(
    private recommendationService: RecommendationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.startAnalysis();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentPlanName'] && !changes['currentPlanName'].firstChange) {
      this.startAnalysis();
    }
  }

  startAnalysis(): void {
    this.loading = true;
    this.analyzing = true;
    this.currentStep = 0;
    this.displayScore = 0;
    this.showDetails = false;

    // Reset steps
    this.analysisSteps.forEach(s => s.done = false);

    // Simulate step-by-step analysis (visual effect)
    this.simulateSteps();

    // Load usage analysis
    this.recommendationService.getUsageAnalysis(this.userType).subscribe(analysis => {
      this.usageAnalysis = analysis;
    });

    // Load recommendation
    this.recommendationService.getRecommendation(
      this.currentPlanName,
      this.userType
    ).subscribe(rec => {
      this.recommendation = rec;
      this.loading = false;

      // Animate confidence score after steps finish
      setTimeout(() => {
        this.analyzing = false;
        this.animateScore(rec.confidenceScore);
      }, 500);
    });
  }

  private simulateSteps(): void {
    const stepInterval = 400;
    this.analysisSteps.forEach((step, i) => {
      setTimeout(() => {
        this.currentStep = i;
        step.done = true;
      }, stepInterval * (i + 1));
    });
  }

  private animateScore(target: number): void {
    const duration = 1200;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      this.displayScore = Math.round(target * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  goToPlans(): void {
    this.router.navigate(['/app/subscription/plans']);
  }

  getScoreColor(): string {
    if (!this.recommendation) return '#6366f1';
    const score = this.recommendation.confidenceScore;
    if (score >= 75) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    return '#10b981';
  }

  getScoreLabel(): string {
    if (!this.recommendation) return '';
    const score = this.recommendation.confidenceScore;
    if (score >= 75) return 'Strongly Recommended';
    if (score >= 50) return 'Recommended';
    if (score >= 25) return 'Consider';
    return 'Optimal';
  }

  getUrgencyClass(): string {
    return this.recommendation?.urgency || 'low';
  }

  getCircleOffset(): number {
    const circumference = 2 * Math.PI * 45; // ~283
    return circumference - (circumference * this.displayScore) / 100;
  }
}