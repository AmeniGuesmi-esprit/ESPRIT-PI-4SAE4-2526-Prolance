import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { RecommendationService, RecommendationDTO } from '../../services/Recommendation.service';

@Component({
  selector: 'app-recommendation-carousel',
  templateUrl: './recommendation-carousel.component.html',
  styleUrls:  ['./recommendation-carousel.component.css']
})
export class RecommendationCarouselComponent implements OnInit, OnDestroy {

  @Input() userId!: string;

  recommendations: RecommendationDTO[] = [];
  loading  = true;
  errorMsg = '';

  // Carousel state
  currentIndex  = 0;
  visibleCount  = 3;   
  autoPlayTimer: any;

  constructor(private recService: RecommendationService) {}

  ngOnInit(): void {
    if (!this.userId) { this.loading = false; return; }

    this.recService.getRecommendations(this.userId, 8).subscribe({
      next: (data) => {
        this.recommendations = data;
        this.loading = false;
        this.startAutoPlay();
      },
      error: () => {
        this.errorMsg = 'Impossible de charger les recommandations.';
        this.loading  = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }

  // ── Navigation ──────────────────────────────────────────────────

  get maxIndex(): number {
    return Math.max(0, this.recommendations.length - this.visibleCount);
  }

  prev(): void {
    this.currentIndex = Math.max(0, this.currentIndex - 1);
    this.resetAutoPlay();
  }

  next(): void {
    this.currentIndex = this.currentIndex >= this.maxIndex ? 0 : this.currentIndex + 1;
    this.resetAutoPlay();
  }

  goTo(index: number): void {
    this.currentIndex = Math.min(index, this.maxIndex);
    this.resetAutoPlay();
  }

  get translateX(): number {
    // Chaque carte = 100/visibleCount % + gap compensé
    return this.currentIndex * (100 / this.visibleCount);
  }

  get dotCount(): number {
    return this.maxIndex + 1;
  }

  // ── AutoPlay ────────────────────────────────────────────────────

  startAutoPlay(): void {
    this.autoPlayTimer = setInterval(() => this.next(), 3500);
  }

  stopAutoPlay(): void {
    if (this.autoPlayTimer) clearInterval(this.autoPlayTimer);
  }

  resetAutoPlay(): void {
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  // ── Helpers ─────────────────────────────────────────────────────

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'Développement':  'code',
      'Design':         'brush',
      'Data':           'analytics',
      'Transversal':    'hub',
      'Marketing':      'campaign',
      'Management':     'group',
    };
    return icons[category] ?? 'star';
  }

  getLevelColor(level: string): string {
    const colors: Record<string, string> = {
      'Débutant':      '#4ade80',
      'Intermédiaire': '#facc15',
      'Avancé':        '#f87171',
    };
    return colors[level] ?? '#94a3b8';
  }

  scorePercent(score: number): number {
    return Math.round(score * 100);
  }
}