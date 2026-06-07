import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.services';
import { AdsService } from '../../services/ads.service';
import { ImageGuardService, ValidationResult } from '../../services/image-guard.service';
import { AdPlan, AdCampaign, CampaignStatus, RoleType, CreateCampaignRequest, ContentValidationResponse } from './models/ad.models';

export const SAFETY_POLICIES: Record<string, string> = {
  S1: 'S1: Violent Crimes',
  S2: 'S2: Non-Violent Crimes',
  S3: 'S3: Sex-Related Crimes',
  S4: 'S4: Child Sexual Exploitation',
  S5: 'S5: Defamation',
  S6: 'S6: Specialized Advice',
  S7: 'S7: Privacy Violations',
  S8: 'S8: Intellectual Property',
  S9: 'S9: Indiscriminate Weapons',
  S10: 'S10: Hate Speech',
  S11: 'S11: Suicide & Self-Harm',
  S12: 'S12: Sexual Content',
  S13: 'S13: Elections & Misinformation',
  S14: 'S14: Code Interpreter Abuse',
};

declare let Chart: any;

interface RoleColorPalette {
  readonly primary: string;
  readonly primaryLight: string;
  readonly primaryDark: string;
  readonly gradient: string;
  readonly rgbaFill: string;
  readonly rgbaFillLight: string;
  readonly secondary: string;
  readonly cardHeaderClass: string;
}

@Component({
  selector: 'app-ad-center',
  templateUrl: './ad-center.component.html',
  styleUrls: ['./ad-center.component.scss']
})
export class AdCenterComponent implements OnInit, OnDestroy, AfterViewInit {
  // ── Role (auto-detected from JWT) ──
  currentRole: RoleType = 'FREELANCER';

  // ── Role-Based Color Palette (Purple-Centric) ──
  readonly ROLE_COLORS: Record<RoleType, RoleColorPalette> = {
    FREELANCER: {
      primary: '#7B68EE',        // Vibrant Purple (Medium Slate Blue)
      primaryLight: '#9370DB',   // Medium Purple
      primaryDark: '#6A5ACD',    // Slate Blue
      gradient: 'linear-gradient(135deg, #7B68EE, #6A5ACD)',
      rgbaFill: 'rgba(123, 104, 238, 0.10)',
      rgbaFillLight: 'rgba(123, 104, 238, 0.04)',
      secondary: '#8A2BE2',      // Blue Violet
      cardHeaderClass: 'card-header-primary'
    },
    CLIENT: {
      primary: '#483D8B',        // Deep Purple (Dark Slate Blue)
      primaryLight: '#6A5ACD',   // Slate Blue
      primaryDark: '#2F2A5C',    // Darker Deep Purple
      gradient: 'linear-gradient(135deg, #483D8B, #2F2A5C)',
      rgbaFill: 'rgba(72, 61, 139, 0.10)',
      rgbaFillLight: 'rgba(72, 61, 139, 0.04)',
      secondary: '#5D4E99',      // Mid-tone Purple
      cardHeaderClass: 'card-header-info'
    }
  };

  // ── Loading / Empty / Toast State ──
  isLoading = false;
  plansLoading = false;
  plansError = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Modal State ──
  showCreateModal = false;
  modalStep = 1;
  isEditing = false;
  editingCampaignId: number | null = null;

  // ── Delete Confirm ──
  showDeleteConfirm = false;
  deletingCampaignId: number | null = null;

  // ── Form Fields ──
  selectedPlanId: number | null = null;
  formTitle = '';
  formDescription = '';
  formImageUrl = '';
  formTargetUrl = '';
  isValidImageUrl = false;
  
  // ── AI Generation Tracking ──
  isAiGenerated = false;
  aiGeneratedTitle = '';
  aiGeneratedDescription = '';
  
  // ── Image Validation State ──
  imageValidationState: ValidationResult | null = null;
  imageValidationMessage = '';
  isScanning = false;
  
  // ── AI Suggestion State ──
  showAiSuggestionModal = false;
  aiPrompt = '';
  isGeneratingAi = false;
  
  // ── Content Moderation State ──
  moderationViolation = false;
  violationCategory = '';
  showViolationAlert = false;

  // ── KPI Stats ──
  stats = {
    activeAds: 0,
    totalImpressions: 0,
    totalClicks: 0,
    remainingBudget: 0
  };

  // ── Ad Plans (loaded from backend) ──
  adPlans: AdPlan[] = [];

  // ── Campaigns (loaded from backend) ──
  campaigns: AdCampaign[] = [];

  // ── Chart References ──
  @ViewChild('perfChart', { static: false }) perfChartRef!: ElementRef<HTMLCanvasElement>;
  private perfChartInstance: any = null;

  // Market Insights Charts
  @ViewChild('reachChart', { static: false }) reachChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('conversionChart', { static: false }) conversionChartRef!: ElementRef<HTMLCanvasElement>;
  private reachChartInstance: any = null;
  private conversionChartInstance: any = null;

  constructor(
    private authService: AuthService, 
    private adsService: AdsService,
    private imageGuard: ImageGuardService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Auto-detect role from JWT — no manual toggle
    const role = this.authService.getRole();
    if (role === 'FREELANCER' || role === 'CLIENT') {
      this.currentRole = role;
    }
    this.loadPlans();
    this.loadCampaigns();
  }

  ngAfterViewInit(): void {
    this.initPerformanceChart();
    this.initMarketInsightsCharts();
  }

  ngOnDestroy(): void {
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
    }
    this.perfChartInstance?.destroy();
    this.reachChartInstance?.destroy();
    this.conversionChartInstance?.destroy();
  }

  // ═══════════════════════════════════════════════
  // ROLE-AWARE ACCESSORS
  // ═══════════════════════════════════════════════

  get roleColors(): RoleColorPalette {
    return this.ROLE_COLORS[this.currentRole];
  }

  get roleCardHeaderClass(): string {
    return this.roleColors.cardHeaderClass;
  }

  // ── Plans filtered by active role ──
  get rolePlans(): AdPlan[] {
    return this.adPlans.filter(p => p.roleType === this.currentRole);
  }

  // ── Campaigns — no filter needed, backend returns only user's campaigns ──
  get roleCampaigns(): AdCampaign[] {
    return this.campaigns;
  }

  // ── Plan Tier Label ──
  getPlanTier(plan: AdPlan): string {
    if (plan.location === 'LANDING_PAGE') return 'Elite';
    if (plan.location === 'SEARCH_SIDEBAR' || plan.name.toLowerCase().includes('feed banner')) return 'Pro';
    return 'Starter';
  }

  // ── Dynamic Performance Section Headers ──
  get perfTitle(): string {
    return this.currentRole === 'FREELANCER' ? 'Profile Performance' : 'Jobs Visibility';
  }

  get perfCategory(): string {
    return this.currentRole === 'FREELANCER'
      ? 'How many times your profile was featured'
      : 'Reach of your promoted job postings';
  }

  // ═══════════════════════════════════════════════
  // STATUS & UI HELPERS
  // ═══════════════════════════════════════════════

  statusBadgeClass(status: CampaignStatus): string {
    switch (status) {
      case 'PENDING': return 'badge-warning';
      case 'ACTIVE': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      case 'EXPIRED': return 'badge-expired';
      default: return '';
    }
  }

  // ═══════════════════════════════════════════════
  // CRUD — CREATE  (HttpClient-ready)
  // ═══════════════════════════════════════════════

  openCreateModal(): void {
    this.isEditing = false;
    this.editingCampaignId = null;
    this.resetForm();
    this.modalStep = 1;
    this.showCreateModal = true;
  }

  // ═══════════════════════════════════════════════
  // CRUD — UPDATE  (HttpClient-ready)
  // ═══════════════════════════════════════════════

  openEditModal(campaign: AdCampaign): void {
    this.isEditing = true;
    this.editingCampaignId = campaign.id;
    this.selectedPlanId = campaign.planId;
    this.formTitle = campaign.title;
    this.formDescription = campaign.description;
    this.formImageUrl = campaign.imageUrl;
    this.formTargetUrl = campaign.targetUrl;
    this.validateImageUrl();
    this.modalStep = 2;
    this.showCreateModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.resetForm();
  }

  // ── Step Navigation ──
  nextStep(): void {
    if (this.modalStep < 3) this.modalStep++;
  }

  prevStep(): void {
    if (this.modalStep > 1) this.modalStep--;
  }

  goToStep(step: number): void {
    if (step <= this.modalStep || this.canGoToStep(step)) {
      this.modalStep = step;
    }
  }

  canGoToStep(step: number): boolean {
    if (step === 2) return this.selectedPlanId !== null;
    if (step === 3) return this.selectedPlanId !== null && this.formTitle.trim() !== '' && this.formDescription.trim() !== '';
    return true;
  }

  // ── Select Plan ──
  selectPlan(planId: number): void {
    this.selectedPlanId = planId;
  }

  get selectedPlan(): AdPlan | undefined {
    return this.adPlans.find(p => p.id === this.selectedPlanId);
  }

  // ── Image URL Validation with AI Scanning ──
  async validateImageUrl(): Promise<void> {
    const url = this.formImageUrl?.trim();
    
    // Reset validation state
    this.imageValidationState = null;
    this.imageValidationMessage = '';
    this.isValidImageUrl = false;
    
    if (!url) {
      return;
    }
    
    // Basic URL validation
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        this.imageValidationState = null;
        return;
      }
      this.isValidImageUrl = true;
    } catch {
      this.imageValidationState = null;
      return;
    }
    
    // Start AI scanning
    this.isScanning = true;
    
    try {
      const validation = await this.imageGuard.validateLink(url);
      this.imageValidationState = validation.result;
      this.imageValidationMessage = validation.message;
    } catch {
      this.imageValidationState = 'UNCERTAIN';
      this.imageValidationMessage = 'Your picture could not be scanned. You can post your ad, but it will go through our backend AI model for deeper analysis; your post may be flagged if it violates terms.';
    } finally {
      this.isScanning = false;
    }
  }

  clearImageUrl(): void {
    this.formImageUrl = '';
    this.isValidImageUrl = false;
    this.imageValidationState = null;
    this.imageValidationMessage = '';
    this.isScanning = false;
  }
  
  // Disable submit if image is UNSAFE
  get canSubmitCampaign(): boolean {
    return this.imageValidationState !== 'UNSAFE';
  }

  submitCampaign(): void {
    const plan = this.selectedPlan;
    if (!plan) {
      return;
    }

    this.resetModerationState();

    this.adsService.validateAdContent(this.formTitle, this.formDescription).subscribe({
      next: (validation: ContentValidationResponse) => this.handleValidationResult(validation),
      error: () => this.performSubmission()
    });
  }

  private resetModerationState(): void {
    this.moderationViolation = false;
    this.violationCategory = '';
    this.showViolationAlert = false;
  }

  private handleValidationResult(validation: ContentValidationResponse): void {
    const code = validation.categoryCode || '';
    const isViolation = !validation.isSafe && /^S\d+$/i.test(code);

    if (isViolation) {
      this.moderationViolation = true;
      this.violationCategory = SAFETY_POLICIES[code.toUpperCase()] || code || 'Unknown Policy Violation';
      this.showViolationAlert = true;
      return;
    }

    this.performSubmission();
  }

  private performSubmission(): void {
    const plan = this.selectedPlan;
    if (!plan) {
      return;
    }

    const payload: CreateCampaignRequest = {
      planId: plan.id,
      title: this.formTitle,
      description: this.formDescription,
      imageUrl: this.formImageUrl?.trim() || '',
      targetUrl: this.formTargetUrl,
      roleType: this.currentRole,
      usedAiSuggestion: this.isAiGenerated
    };

    if (this.isEditing && this.editingCampaignId !== null) {
      this.adsService.updateCampaign(this.editingCampaignId, payload).subscribe({
        next: () => {
          this.closeModal();
          this.displayToast('Campaign updated successfully!', 'success');
          this.loadCampaigns();
        },
        error: () => {
          this.closeModal();
          this.displayToast('Failed to update campaign. Please try again.', 'error');
        }
      });
    } else {
      this.adsService.createCampaign(payload).subscribe({
        next: () => {
          this.closeModal();
          this.displayToast('Campaign created! It is now pending approval.', 'success');
          this.loadCampaigns();
        },
        error: () => {
          this.closeModal();
          this.displayToast('Failed to create campaign. Please try again.', 'error');
        }
      });
    }
  }

  private displayToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.showToast = false, 4000);
  }

  // ═══════════════════════════════════════════════
  // AI SUGGESTION FEATURE
  // ═══════════════════════════════════════════════

  openAiSuggestionModal(): void {
    this.showAiSuggestionModal = true;
    this.aiPrompt = '';
  }

  closeAiSuggestionModal(): void {
    this.showAiSuggestionModal = false;
    this.aiPrompt = '';
    this.isGeneratingAi = false;
  }

  generateAiSuggestion(): void {
    if (!this.aiPrompt.trim()) {
      return;
    }

    this.isGeneratingAi = true;

    this.adsService.generateAiSuggestion(this.aiPrompt).subscribe({
      next: (suggestion) => {
        this.isGeneratingAi = false;
        this.closeAiSuggestionModal();
        this.applyAiSuggestion(suggestion.title, suggestion.description);
      },
      error: () => {
        this.isGeneratingAi = false;
        this.displayToast('Failed to generate AI suggestion. Please try again.', 'error');
      }
    });
  }

  private applyAiSuggestion(title: string, description: string): void {
    setTimeout(() => {
      this.formTitle = title;
      this.formDescription = description;
      this.isAiGenerated = true;
      this.aiGeneratedTitle = title;
      this.aiGeneratedDescription = description;
      this.cdr.detectChanges();
      this.displayToast('AI suggestion applied successfully!', 'success');
    }, 100);
  }

  // ═══════════════════════════════════════════════
  // MODERATION ALERT HANDLING
  // ═══════════════════════════════════════════════

  closeViolationAlert(): void {
    this.showViolationAlert = false;
  }

  openPolicyPage(): void {
    this.router.navigate(['/ads-policy']);
  }

  // ═══════════════════════════════════════════════
  // AI GENERATION TRACKING
  // ═══════════════════════════════════════════════

  /**
   * Track manual edits after AI generation
   * If user clears both fields, reset AI flag
   * If user makes significant changes (10+ chars), keep AI flag (it's AI-assisted)
   */
  onFormFieldChange(): void {
    if (!this.isAiGenerated) return;

    // If both fields are cleared, reset AI flag
    if (!this.formTitle.trim() && !this.formDescription.trim()) {
      this.isAiGenerated = false;
      this.aiGeneratedTitle = '';
      this.aiGeneratedDescription = '';
      return;
    }

    // Keep isAiGenerated = true even if user edits
    // The requirement states: "if they manually change more than 10 characters, 
    // keep the flag as true (it's still AI-assisted)"
  }

  // ═══════════════════════════════════════════════
  // CRUD — DELETE  (HttpClient-ready)
  // ═══════════════════════════════════════════════

  /**
   * Ready for HttpClient: replace with
   *   this.http.delete(`/api/campaigns/${id}`)
   */
  confirmDelete(campaignId: number): void {
    this.deletingCampaignId = campaignId;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingCampaignId = null;
  }

  deleteCampaign(): void {
    if (this.deletingCampaignId !== null) {
      const id = this.deletingCampaignId;
      this.showDeleteConfirm = false;
      this.deletingCampaignId = null;
      this.adsService.deleteCampaign(id).subscribe({
        next: () => {
          this.displayToast('Campaign deleted.', 'success');
          this.loadCampaigns();
        },
        error: () => {
          this.displayToast('Failed to delete campaign.', 'error');
        }
      });
    } else {
      this.showDeleteConfirm = false;
      this.deletingCampaignId = null;
    }
  }

  canEdit(campaign: AdCampaign): boolean {
    return campaign.status === 'PENDING' || campaign.status === 'REJECTED';
  }

  hasImage(campaign: AdCampaign): boolean {
    return !!(campaign.imageUrl && campaign.imageUrl.trim() !== '');
  }

  getAdImage(campaign: AdCampaign): string {
    if (this.hasImage(campaign)) return campaign.imageUrl;
    return this.getDiceBearUrl(campaign.title, campaign.roleType);
  }

  getPreviewImage(): string {
    if (this.formImageUrl && this.formImageUrl.trim() !== '') return this.formImageUrl;
    return this.getDiceBearUrl(this.formTitle || 'Preview', this.currentRole);
  }

  onImgError(event: Event, campaign: AdCampaign): void {
    (event.target as HTMLImageElement).src = this.getDiceBearUrl(campaign.title, campaign.roleType);
  }

  onPreviewImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.getDiceBearUrl(this.formTitle || 'Preview', this.currentRole);
    // Mark URL as invalid if it fails to load
    this.isValidImageUrl = false;
  }

  private getDiceBearUrl(title: string, role: string): string {
    return role === 'FREELANCER'
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(title)}`
      : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(title)}`;
  }

  // ═══════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════

  private loadCampaigns(): void {
    this.isLoading = true;
    this.adsService.getMyCampaigns().subscribe({
      next: (data) => {
        this.campaigns = data;
        this.recalcStats();
        this.isLoading = false;
      },
      error: () => {
        this.campaigns = [];
        this.recalcStats();
        this.isLoading = false;
      }
    });
  }

  private loadPlans(): void {
    this.plansLoading = true;
    this.plansError = false;
    this.adsService.getPlans().subscribe({
      next: (plans) => {
        const iconMap: Record<string, string> = {
          'FEATURED_PROFILE': 'person_pin', 'BANNER': 'panorama',
          'JOB_BOOST': 'work_outline'
        };
        this.adPlans = plans.map(p => ({ ...p, icon: iconMap[p.type] || 'campaign' }));
        this.plansLoading = false;
      },
      error: () => {
        this.adPlans = [];
        this.plansLoading = false;
        this.plansError = true;
      }
    });
  }

  private recalcStats(): void {
    const visible = this.roleCampaigns;
    this.stats.activeAds = visible.filter(c => c.status === 'ACTIVE').length;
    this.stats.totalImpressions = visible.reduce((sum, c) => sum + (c.views || 0), 0);
    this.stats.totalClicks = visible.reduce((sum, c) => sum + (c.clicks || 0), 0);
    this.stats.remainingBudget = this.currentRole === 'FREELANCER' ? 1520 : 3200;
  }

  private resetForm(): void {
    this.selectedPlanId = null;
    this.formTitle = '';
    this.formDescription = '';
    this.formImageUrl = '';
    this.formTargetUrl = '';
    this.isValidImageUrl = false;
    this.modalStep = 1;
    this.isEditing = false;
    this.editingCampaignId = null;
    this.isAiGenerated = false;
    this.aiGeneratedTitle = '';
    this.aiGeneratedDescription = '';
  }

  // ═══════════════════════════════════════════════
  // PERFORMANCE CHART (Role-Aware, Chart.js)
  // ═══════════════════════════════════════════════

  private rebuildChart(): void {
    if (this.perfChartInstance) {
      this.perfChartInstance.destroy();
      this.perfChartInstance = null;
    }
    if (this.reachChartInstance) {
      this.reachChartInstance.destroy();
      this.reachChartInstance = null;
    }
    if (this.conversionChartInstance) {
      this.conversionChartInstance.destroy();
      this.conversionChartInstance = null;
    }
    // setTimeout ensures the canvas is available after *ngIf cycles
    setTimeout(() => {
      this.initPerformanceChart();
      this.initMarketInsightsCharts();
    }, 0);
  }

  private initPerformanceChart(): void {
    if (!this.perfChartRef?.nativeElement) return;
    if (typeof Chart === 'undefined') return;

    const ctx = this.perfChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = this.roleColors;
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Role-specific mock data
    const viewsData = this.currentRole === 'FREELANCER'
      ? [320, 450, 380, 510, 620, 480, 550]
      : [410, 520, 490, 630, 710, 560, 640];
    const clicksData = this.currentRole === 'FREELANCER'
      ? [15, 28, 22, 35, 42, 30, 38]
      : [22, 35, 28, 48, 55, 40, 50];

    // Build gradient fills
    const viewsGradient = ctx.createLinearGradient(0, 0, 0, 250);
    viewsGradient.addColorStop(0, colors.rgbaFill);
    viewsGradient.addColorStop(1, 'rgba(255,255,255,0)');

    const clicksGradient = ctx.createLinearGradient(0, 0, 0, 250);
    clicksGradient.addColorStop(0, 'rgba(255, 152, 0, 0.10)');
    clicksGradient.addColorStop(1, 'rgba(255,255,255,0)');

    this.perfChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: this.currentRole === 'FREELANCER' ? 'Profile Views' : 'Job Views',
            data: viewsData,
            borderColor: colors.primary,
            backgroundColor: viewsGradient,
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: colors.primary,
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          },
          {
            label: 'Clicks',
            data: clicksData,
            borderColor: '#ff9800',
            backgroundColor: clicksGradient,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: '#ff9800',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true, padding: 20, font: { size: 12 } }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } }
        }
      }
    });
  }

  // ═══════════════════════════════════════════════
  // SPARKLINE (Role-Aware)
  // ═══════════════════════════════════════════════

  getSparklinePath(data: number[]): string {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data, 1);
    const width = 80;
    const height = 24;
    const step = width / (data.length - 1);
    return data.map((val, i) => {
      const x = i * step;
      const y = height - (val / max) * height;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  }

  getSparklineColor(status: CampaignStatus): string {
    const rolePrimary = this.roleColors.primary;
    switch (status) {
      case 'ACTIVE': return rolePrimary;
      case 'PENDING': return '#ff9800';
      case 'REJECTED': return '#f44336';
      case 'EXPIRED': return '#9e9e9e';
      default: return rolePrimary;
    }
  }

  // ═══════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════

  formatNumber(val: number): string {
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return val.toString();
  }

  // ═══════════════════════════════════════════════
  // MARKET INSIGHTS CHARTS (Role-Aware)
  // ═══════════════════════════════════════════════

  private initMarketInsightsCharts(): void {
    this.initReachChart();
    this.initConversionChart();
  }

  /**
   * Reach Statistics — Line Chart
   * Shows 'Global Impressions' over time with role-specific branding
   * Ready for HttpClient: GET /api/ads/statistics/reach?role={role}
   */
  private initReachChart(): void {
    if (!this.reachChartRef?.nativeElement) return;
    if (typeof Chart === 'undefined') return;

    const ctx = this.reachChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = this.roleColors;
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];

    // Role-specific mock data (impressions over 6 weeks)
    const reachData = this.currentRole === 'FREELANCER'
      ? [1200, 1450, 1680, 1920, 2100, 2350]
      : [1800, 2100, 2450, 2680, 2900, 3200];

    // Build gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, colors.rgbaFill.replace('0.10', '0.4')); // 0.4 opacity
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    this.reachChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: this.currentRole === 'FREELANCER' ? 'Profile Views' : 'Job Views',
          data: reachData,
          borderColor: colors.primary,
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: colors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true, padding: 15, font: { size: 11 } }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  /**
   * Conversion Statistics — Bar Chart
   * Shows 'Average CTR (Click-Through Rate)' by Ad Type
   * Ready for HttpClient: GET /api/ads/statistics/conversion?role={role}
   */
  private initConversionChart(): void {
    if (!this.conversionChartRef?.nativeElement) return;
    if (typeof Chart === 'undefined') return;

    const ctx = this.conversionChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = this.roleColors;

    // Role-specific labels and data
    const labels = this.currentRole === 'FREELANCER'
      ? ['Profile Views', 'Skill Searches', 'Portfolio Clicks']
      : ['Job Views', 'Application Starts', 'Candidate Engagement'];

    const ctrData = this.currentRole === 'FREELANCER'
      ? [5.2, 7.8, 6.1] // CTR percentages
      : [4.8, 6.5, 5.9];

    // Build gradient for bars
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, colors.primary);
    gradient.addColorStop(1, colors.primaryDark);

    this.conversionChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Average CTR (%)',
          data: ctrData,
          backgroundColor: gradient,
          borderColor: colors.primaryDark,
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 45
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            beginAtZero: true,
            max: 10,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              font: { size: 10 },
              callback: (value: any) => value + '%'
            }
          }
        }
      }
    });
  }

  get marketInsightsSubtitle(): string {
    return this.currentRole === 'FREELANCER'
      ? 'Real-time market trends for Freelancers'
      : 'Real-time market trends for Clients';
  }
}
