import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from '../../../models/subscription.model';
import { SubscriptionService } from '../../../services/subscription.service';

@Component({
  selector: 'app-subscription-list',
  templateUrl: './subscription-list.component.html',
  styleUrls: ['./subscription-list.component.scss'],
})
export class SubscriptionListComponent implements OnInit {
  subscriptions: Subscription[] = [];
  filteredSubscriptions: Subscription[] = [];
  searchTerm: string = '';
  filterType: string = 'ALL';
  sortBy: string = 'price_asc';
  loading: boolean = false;
  errorMessage: string = '';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 1;

  // ═══════════════════════════════════════════════════════════
  //  AI GENERATION
  // ═══════════════════════════════════════════════════════════
  showAIModal: boolean = false;
  aiGenerating: boolean = false;
  aiProgress: number = 0;
  aiCurrentStep: string = '';
  aiGeneratedPlans: Subscription[] = [];
  showAIResults: boolean = false;
  aiSaving: boolean = false;
  aiSaveProgress: number = 0;
  aiSaveSuccess: boolean = false;
  aiSavedCount: number = 0;

  aiConfig = {
    targetType: 'BOTH' as 'FREELANCER' | 'CLIENT' | 'BOTH',
    numberOfPlans: 3,
    priceRange: 'medium' as 'low' | 'medium' | 'high' | 'premium',
    includeFree: true,
    billingCycle: 'BOTH' as 'SEMESTRIELLE' | 'ANNUELLE' | 'BOTH',
    autoSave: true,  // ✅ Sauvegarde automatique activée par défaut
  };

  aiSteps = [
    { icon: '🔍', label: 'Analyse du marché...', done: false },
    { icon: '📊', label: 'Optimisation des prix...', done: false },
    { icon: '🎯', label: 'Configuration des features...', done: false },
    { icon: '✨', label: 'Génération des plans...', done: false },
    { icon: '✅', label: 'Validation finale...', done: false },
  ];

  constructor(
    private subscriptionService: SubscriptionService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadSubscriptions();
  }
refresh(): void {
    this.loadSubscriptions();
  }
  loadSubscriptions(): void {
    this.loading = true;
    this.subscriptionService.getAllSubscriptions().subscribe(
      (data: Subscription[]) => {
        this.subscriptions = data;
        this.applyFilters();
        this.loading = false;
      },
      (error) => {
        console.error('Error:', error);
        this.errorMessage = 'Unable to load plans.';
        this.loading = false;
      }
    );
  }

  applyFilters(): void {
    let result = [...this.subscriptions];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(term) ||
        s.type.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term)
      );
    }

    if (this.filterType !== 'ALL') {
      result = result.filter((s) => s.type === this.filterType);
    }

    switch (this.sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    this.totalPages = Math.ceil(result.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) this.currentPage = 1;

    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.filteredSubscriptions = result.slice(start, start + this.itemsPerPage);
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterType(type: string): void {
    this.filterType = type;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSort(sort: string): void {
    this.sortBy = sort;
    this.applyFilters();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.applyFilters();
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getTotalFiltered(): number {
    let result = [...this.subscriptions];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(term) || s.type.toLowerCase().includes(term)
      );
    }
    if (this.filterType !== 'ALL') {
      result = result.filter((s) => s.type === this.filterType);
    }
    return result.length;
  }

  getCycleLabel(cycle: string): string {
    return cycle === 'SEMESTRIELLE' ? 'SEMI.' : 'ANNUAL';
  }

  onToggleActive(sub: Subscription): void {
    if (sub.isActive) {
      this.subscriptionService.deactivateSubscription(sub.id!).subscribe(
        () => { sub.isActive = false; },
        (error) => alert('Error: ' + error.message)
      );
    } else {
      this.subscriptionService.activateSubscription(sub.id!).subscribe(
        () => { sub.isActive = true; },
        (error) => alert('Error: ' + error.message)
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  AI GENERATION METHODS
  // ═══════════════════════════════════════════════════════════

  openAIModal(): void {
    this.showAIModal = true;
    this.showAIResults = false;
    this.aiGenerating = false;
    this.aiSaving = false;
    this.aiSaveSuccess = false;
    this.aiProgress = 0;
    this.aiSavedCount = 0;
    this.aiGeneratedPlans = [];
    this.aiSteps.forEach(s => s.done = false);
  }

  closeAIModal(): void {
    this.showAIModal = false;
    this.aiGenerating = false;
    this.aiSaving = false;
  }

  startAIGeneration(): void {
    this.aiGenerating = true;
    this.aiProgress = 0;
    this.aiSteps.forEach(s => s.done = false);
    this.runAISteps();
  }

  private runAISteps(): void {
    const totalSteps = this.aiSteps.length;
    let currentStep = 0;

    const processStep = () => {
      if (currentStep < totalSteps) {
        this.aiCurrentStep = this.aiSteps[currentStep].label;
        this.aiProgress = ((currentStep + 1) / totalSteps) * 100;

        setTimeout(() => {
          this.aiSteps[currentStep].done = true;
          currentStep++;
          processStep();
        }, 600 + Math.random() * 400);
      } else {
        // Génération terminée
        this.aiGeneratedPlans = this.generateAIPlans();
        this.aiGenerating = false;
        
        // ✅ AUTO-SAVE si activé
        if (this.aiConfig.autoSave) {
          this.autoSaveAllPlans();
        } else {
          this.showAIResults = true;
        }
      }
    };

    processStep();
  }

  private generateAIPlans(): Subscription[] {
    const plans: Subscription[] = [];
    const types: ('FREELANCER' | 'CLIENT')[] = 
      this.aiConfig.targetType === 'BOTH' 
        ? ['FREELANCER', 'CLIENT'] 
        : [this.aiConfig.targetType];

    const priceMultiplier = {
      low: 0.5,
      medium: 1,
      high: 1.5,
      premium: 2.5
    };

    const basePrices = {
      starter: 0,
      pro: 29.99,
      elite: 79.99
    };

    const tiers = ['Starter', 'Pro', 'Elite'];
    const mult = priceMultiplier[this.aiConfig.priceRange];
    
    // ✅ Générer un suffixe unique pour éviter les doublons
    const uniqueSuffix = this.generateUniqueSuffix();

    types.forEach(type => {
      const cycles: ('SEMESTRIELLE' | 'ANNUELLE')[] = 
        this.aiConfig.billingCycle === 'BOTH' 
          ? ['SEMESTRIELLE', 'ANNUELLE'] 
          : [this.aiConfig.billingCycle];

      cycles.forEach(cycle => {
        tiers.slice(0, this.aiConfig.numberOfPlans).forEach((tier, idx) => {
          const basePrice = idx === 0 && this.aiConfig.includeFree ? 0 : Object.values(basePrices)[idx] * mult;
          const cycleMultiplier = cycle === 'ANNUELLE' ? 1.8 : 1;
          
          // ✅ Nom unique avec suffixe
          const cycleSuffix = cycle === 'ANNUELLE' ? 'Annual' : 'Semi';
          const baseName = `${type === 'FREELANCER' ? 'Freelancer' : 'Client'} ${tier}`;
          const uniqueName = `${baseName} ${cycleSuffix} ${uniqueSuffix}`;
          
          const plan: any = {
            name: uniqueName,
            description: this.generateDescription(type, tier),
            price: Math.round(basePrice * cycleMultiplier * 100) / 100,
            type: type,
            billingCycle: cycle,
            maxProjects: this.getMaxProjects(tier, type),
            maxProposals: this.getMaxProposals(tier, type),
            maxActiveJobs: this.getMaxActiveJobs(tier, type),
            analyticsAccess: idx >= 1,
            featuredListing: idx >= 1,
            prioritySupport: idx >= 2,
          };

          plans.push(plan);
        });
      });
    });

    return plans;
  }

  // ✅ Générer un suffixe unique (ex: "v2", "v3", etc.)
  private generateUniqueSuffix(): string {
    const now = new Date();
    const timestamp = `${now.getHours()}${now.getMinutes()}`;
    return `v${timestamp}`;
  }

  private generateDescription(type: string, tier: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      FREELANCER: {
        Starter: 'Démarrez votre carrière freelance gratuitement',
        Pro: 'Boostez votre visibilité et décrochez plus de missions',
        Elite: 'Accès illimité et support prioritaire pour les pros'
      },
      CLIENT: {
        Starter: 'Publiez vos premiers projets gratuitement',
        Pro: 'Recrutez efficacement avec des outils avancés',
        Elite: 'Solution enterprise avec matching IA et support dédié'
      }
    };
    return descriptions[type]?.[tier] || `Plan ${tier} pour ${type}`;
  }

  private getMaxProjects(tier: string, type: string): number {
    if (type === 'FREELANCER') return 0;
    const values: Record<string, number> = { Starter: 3, Pro: 10, Elite: 999 };
    return values[tier] || 5;
  }

  private getMaxProposals(tier: string, type: string): number {
    const values: Record<string, number> = { Starter: 10, Pro: 50, Elite: 999 };
    return values[tier] || 20;
  }

  private getMaxActiveJobs(tier: string, type: string): number {
    if (type === 'CLIENT') return 0;
    const values: Record<string, number> = { Starter: 2, Pro: 5, Elite: 999 };
    return values[tier] || 3;
  }

  // ═══════════════════════════════════════════════════════════
  //  AUTO-SAVE - Sauvegarde automatique après génération
  // ═══════════════════════════════════════════════════════════

  private autoSaveAllPlans(): void {
    this.aiSaving = true;
    this.aiSaveProgress = 0;
    this.aiCurrentStep = 'Sauvegarde des plans...';
    
    const plansToSave = [...this.aiGeneratedPlans];
    const total = plansToSave.length;
    let saved = 0;
    let errors = 0;
    const savedPlans: Subscription[] = [];

    const saveNext = (index: number) => {
      if (index >= total) {
        // Terminé
        this.aiSaving = false;
        this.aiSaveProgress = 100;
        this.aiSavedCount = saved;
        
        if (errors === 0) {
          this.aiSaveSuccess = true;
          this.aiCurrentStep = `✅ ${saved} plans créés avec succès !`;
          this.aiGeneratedPlans = [];
          
          // Rafraîchir la liste et fermer après 2 secondes
          setTimeout(() => {
            this.loadSubscriptions();
            this.closeAIModal();
          }, 2500);
        } else {
          this.aiCurrentStep = `⚠️ ${saved} plans créés, ${errors} erreurs`;
          this.showAIResults = true;
        }
        return;
      }

      const plan = plansToSave[index];
      this.aiCurrentStep = `💾 Sauvegarde "${plan.name}"... (${index + 1}/${total})`;
      this.aiSaveProgress = ((index + 1) / total) * 100;

      // ✅ Créer un objet propre pour l'API (SANS isActive)
      const createRequest = {
        name: plan.name,
        type: plan.type,
        price: plan.price,
        billingCycle: plan.billingCycle,
        description: plan.description,
        maxProjects: plan.maxProjects || 0,
        maxProposals: plan.maxProposals || 0,
        maxActiveJobs: plan.maxActiveJobs || 0,
        featuredListing: plan.featuredListing || false,
        prioritySupport: plan.prioritySupport || false,
        analyticsAccess: plan.analyticsAccess || false,
      };

      this.subscriptionService.createSubscription(createRequest as Subscription).subscribe({
        next: (savedPlan) => {
          saved++;
          savedPlans.push(savedPlan);
          this.subscriptions.push(savedPlan);
          
          // Petit délai pour voir l'animation
          setTimeout(() => saveNext(index + 1), 300);
        },
        error: (err) => {
          console.error(`Erreur sauvegarde "${plan.name}":`, err);
          errors++;
          setTimeout(() => saveNext(index + 1), 300);
        }
      });
    };

    // Démarrer la sauvegarde séquentielle
    saveNext(0);
  }

  // ═══════════════════════════════════════════════════════════
  //  MANUAL SAVE - Pour les plans individuels (si autoSave=false)
  // ═══════════════════════════════════════════════════════════

  saveGeneratedPlan(plan: Subscription): void {
    const createRequest = {
      name: plan.name,
      type: plan.type,
      price: plan.price,
      billingCycle: plan.billingCycle,
      description: plan.description,
      maxProjects: plan.maxProjects || 0,
      maxProposals: plan.maxProposals || 0,
      maxActiveJobs: plan.maxActiveJobs || 0,
      featuredListing: plan.featuredListing || false,
      prioritySupport: plan.prioritySupport || false,
      analyticsAccess: plan.analyticsAccess || false,
    };

    this.subscriptionService.createSubscription(createRequest as Subscription).subscribe({
      next: (saved) => {
        this.subscriptions.push(saved);
        this.applyFilters();
        this.aiGeneratedPlans = this.aiGeneratedPlans.filter(p => p !== plan);
        if (this.aiGeneratedPlans.length === 0) {
          this.closeAIModal();
        }
      },
      error: (error) => {
        console.error('Error saving plan:', error);
        alert('Erreur lors de la sauvegarde: ' + (error.error?.message || error.message));
      }
    });
  }

  saveAllGeneratedPlans(): void {
    this.autoSaveAllPlans();
  }

  removeGeneratedPlan(plan: Subscription): void {
    this.aiGeneratedPlans = this.aiGeneratedPlans.filter(p => p !== plan);
  }

  getPlanIcon(name: string): string {
    if (name.includes('Elite')) return '👑';
    if (name.includes('Pro')) return '⚡';
    return '🚀';
  }
}