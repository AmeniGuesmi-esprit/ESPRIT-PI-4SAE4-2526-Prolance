import { Component, OnInit } from '@angular/core';
import {
  ChurnPrediction,
  ChurnPredictionService,
} from '../../../services/churn-prediction.service';

@Component({
  selector: 'app-churn-prediction',
  templateUrl: './churn-prediction.component.html',
  styleUrls: ['./churn-prediction.component.scss'],
})
export class ChurnPredictionComponent implements OnInit {
  predictions: ChurnPrediction[] = [];
  filteredPredictions: ChurnPrediction[] = [];
  loading = false;
  errorMessage = '';

  // Filters
  filterRisk: string = 'ALL';
  searchTerm: string = '';
  sortBy: string = 'score_desc';

  // Stats
  totalAtRisk = 0;
  criticalCount = 0;
  highCount = 0;
  mediumCount = 0;
  lowCount = 0;
  avgChurnScore = 0;
  revenueAtRisk = 0;

  // Detail panel
  selectedPrediction: ChurnPrediction | null = null;

  constructor(private churnService: ChurnPredictionService) {}

  ngOnInit(): void {
    this.loadPredictions();
  }

  loadPredictions(): void {
    this.loading = true;
    this.errorMessage = '';
    this.churnService.getAllPredictions().subscribe(
      (data) => {
        this.predictions = data;
        this.calculateStats();
        this.applyFilters();
        this.loading = false;
      },
      (error) => {
        console.error('Error:', error);
        this.errorMessage = 'Unable to load churn predictions.';
        this.loading = false;
      }
    );
  }

  calculateStats(): void {
    this.criticalCount = this.predictions.filter(p => p.riskLevel === 'CRITICAL').length;
    this.highCount = this.predictions.filter(p => p.riskLevel === 'HIGH').length;
    this.mediumCount = this.predictions.filter(p => p.riskLevel === 'MEDIUM').length;
    this.lowCount = this.predictions.filter(p => p.riskLevel === 'LOW').length;
    this.totalAtRisk = this.criticalCount + this.highCount;

    if (this.predictions.length > 0) {
      this.avgChurnScore = Math.round(
        this.predictions.reduce((sum, p) => sum + p.churnScore, 0) / this.predictions.length
      );
    }

    this.revenueAtRisk = this.predictions
      .filter(p => p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH')
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  }

  applyFilters(): void {
    let result = [...this.predictions];

    // Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.userName.toLowerCase().includes(term) ||
        p.userEmail.toLowerCase().includes(term) ||
        p.planName.toLowerCase().includes(term)
      );
    }

    // Risk filter
    if (this.filterRisk !== 'ALL') {
      result = result.filter(p => p.riskLevel === this.filterRisk);
    }

    // Sort
    switch (this.sortBy) {
      case 'score_desc':
        result.sort((a, b) => b.churnScore - a.churnScore);
        break;
      case 'score_asc':
        result.sort((a, b) => a.churnScore - b.churnScore);
        break;
      case 'days_asc':
        result.sort((a, b) => a.daysRemaining - b.daysRemaining);
        break;
      case 'revenue_desc':
        result.sort((a, b) => b.amountPaid - a.amountPaid);
        break;
    }

    this.filteredPredictions = result;
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterRisk(risk: string): void {
    this.filterRisk = risk;
    this.applyFilters();
  }

  onSort(sort: string): void {
    this.sortBy = sort;
    this.applyFilters();
  }

  openDetail(prediction: ChurnPrediction): void {
    this.selectedPrediction = prediction;
  }

  closeDetail(): void {
    this.selectedPrediction = null;
  }

  sendRetentionOffer(prediction: ChurnPrediction): void {
    alert(`✅ Retention offer sent to ${prediction.userName} (${prediction.userEmail})\n\nSuggested: ${prediction.suggestedAction}`);
  }

  getRiskClass(level: string): string {
    return 'risk-' + level.toLowerCase();
  }

  getScoreBarWidth(score: number): number {
    return Math.min(score, 100);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  }
}