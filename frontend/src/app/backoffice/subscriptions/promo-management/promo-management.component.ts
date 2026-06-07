import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface PromoCode {
  id: number;
  code: string;
  discountPercent: number;
  description: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
}

interface PromoStats {
  totalPromos: number;
  activePromos: number;
  totalUsages: number;
  averageDiscount: number;
}

@Component({
  selector: 'app-promo-management',
  templateUrl: './promo-management.component.html',
  styleUrls: ['./promo-management.component.scss']
})
export class PromoManagementComponent implements OnInit {
  promos: PromoCode[] = [];
  stats: PromoStats | null = null;
  loading = true;
  
  // Modal
  showModal = false;
  editingPromo: PromoCode | null = null;
  
  // Form
  formData = {
    code: '',
    discountPercent: 10,
    description: '',
    maxUses: 100,
    validDays: 30,
    targetType: 'ALL'
  };

  // AI Generation
  showAIModal = false;
  aiGenerating = false;

  private apiUrl = 'http://localhost:8091/api/promos';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    
    this.http.get<PromoCode[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.promos = data;
        this.loading = false;
      },
      error: () => {
        // Données de démo si le backend ne répond pas
        this.promos = [
          { id: 1, code: 'WELCOME10', discountPercent: 10, description: 'Bienvenue - 10% de réduction', expiresAt: '2026-12-31T23:59:59', maxUses: 100, currentUses: 5, isActive: true },
          { id: 2, code: 'SUMMER25', discountPercent: 25, description: 'Promo été - 25% de réduction', expiresAt: '2026-08-31T23:59:59', maxUses: 50, currentUses: 49, isActive: true },
          { id: 3, code: 'PRO50', discountPercent: 50, description: 'Upgrade Pro - 50% première période', expiresAt: '2026-06-30T23:59:59', maxUses: 20, currentUses: 8, isActive: true },
          { id: 4, code: 'FREELANCER15', discountPercent: 15, description: 'Spécial Freelancers - 15%', expiresAt: '2026-12-31T23:59:59', maxUses: 200, currentUses: 20, isActive: true },
          { id: 5, code: 'NEWCLIENT20', discountPercent: 20, description: 'Nouveaux clients - 20%', expiresAt: '2026-09-30T23:59:59', maxUses: 100, currentUses: 15, isActive: false },
        ];
        this.loading = false;
      }
    });

    this.http.get<PromoStats>(`${this.apiUrl}/stats`).subscribe({
      next: (stats) => this.stats = stats,
      error: () => {
        this.stats = {
          totalPromos: this.promos.length,
          activePromos: this.promos.filter(p => p.isActive).length,
          totalUsages: this.promos.reduce((sum, p) => sum + p.currentUses, 0),
          averageDiscount: Math.round(this.promos.reduce((sum, p) => sum + p.discountPercent, 0) / this.promos.length)
        };
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  CRUD
  // ═══════════════════════════════════════════════════════════

  openCreateModal(): void {
    this.editingPromo = null;
    this.formData = {
      code: '',
      discountPercent: 10,
      description: '',
      maxUses: 100,
      validDays: 30,
      targetType: 'ALL'
    };
    this.showModal = true;
  }

  openEditModal(promo: PromoCode): void {
    this.editingPromo = promo;
    this.formData = {
      code: promo.code,
      discountPercent: promo.discountPercent,
      description: promo.description || '',
      maxUses: promo.maxUses,
      validDays: 30,
      targetType: 'ALL'
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingPromo = null;
  }

  savePromo(): void {
    const promoData: any = {
      code: this.formData.code,
      discountPercent: this.formData.discountPercent,
      description: this.formData.description,
      maxUses: this.formData.maxUses,
      isActive: true,
      expiresAt: new Date(Date.now() + this.formData.validDays * 24 * 60 * 60 * 1000).toISOString()
    };

    if (this.editingPromo) {
      this.http.put<PromoCode>(`${this.apiUrl}/${this.editingPromo.id}`, promoData).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
        },
        error: () => {
          // Simulation locale
          const idx = this.promos.findIndex(p => p.id === this.editingPromo!.id);
          if (idx !== -1) {
            this.promos[idx] = { ...this.promos[idx], ...promoData };
          }
          this.closeModal();
        }
      });
    } else {
      this.http.post<PromoCode>(this.apiUrl, promoData).subscribe({
        next: () => {
          this.loadData();
          this.closeModal();
        },
        error: () => {
          // Simulation locale
          const newPromo: PromoCode = {
            id: Math.max(...this.promos.map(p => p.id)) + 1,
            code: promoData.code,
            discountPercent: promoData.discountPercent,
            description: promoData.description,
            expiresAt: promoData.expiresAt,
            maxUses: promoData.maxUses,
            currentUses: 0,
            isActive: true
          };
          this.promos.unshift(newPromo);
          this.closeModal();
        }
      });
    }
  }

  deletePromo(id: number): void {
    if (confirm('Supprimer ce code promo ?')) {
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => this.loadData(),
        error: () => {
          // Simulation locale
          this.promos = this.promos.filter(p => p.id !== id);
        }
      });
    }
  }

  togglePromo(promo: PromoCode): void {
    this.http.patch<PromoCode>(`${this.apiUrl}/${promo.id}/toggle`, {}).subscribe({
      next: () => this.loadData(),
      error: () => {
        // Simulation locale
        promo.isActive = !promo.isActive;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  AI GENERATION
  // ═══════════════════════════════════════════════════════════

  openAIModal(): void {
    this.showAIModal = true;
  }

  closeAIModal(): void {
    this.showAIModal = false;
  }

  generateAIPromo(): void {
    this.aiGenerating = true;
    
    const params = `?targetType=${this.formData.targetType}&discount=${this.formData.discountPercent}&maxUses=${this.formData.maxUses}&validDays=${this.formData.validDays}`;
    
    this.http.post(`${this.apiUrl}/ai/generate${params}`, null).subscribe({
      next: () => {
        this.aiGenerating = false;
        this.closeAIModal();
        this.loadData();
      },
      error: () => {
        // Simulation locale
        const prefix = this.formData.targetType === 'FREELANCER' ? 'FL' : this.formData.targetType === 'CLIENT' ? 'CL' : 'ALL';
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newPromo: PromoCode = {
          id: Math.max(...this.promos.map(p => p.id), 0) + 1,
          code: `${prefix}${this.formData.discountPercent}${suffix}`,
          discountPercent: this.formData.discountPercent,
          description: `Code IA généré - ${this.formData.discountPercent}% de réduction`,
          expiresAt: new Date(Date.now() + this.formData.validDays * 24 * 60 * 60 * 1000).toISOString(),
          maxUses: this.formData.maxUses,
          currentUses: 0,
          isActive: true
        };
        this.promos.unshift(newPromo);
        this.aiGenerating = false;
        this.closeAIModal();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════

  getStatusClass(promo: PromoCode): string {
    if (!promo.isActive) return 'inactive';
    if (promo.currentUses >= promo.maxUses) return 'exhausted';
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return 'expired';
    return 'active';
  }

  getStatusLabel(promo: PromoCode): string {
    const status = this.getStatusClass(promo);
    const labels: Record<string, string> = {
      active: 'Actif',
      inactive: 'Inactif',
      exhausted: 'Épuisé',
      expired: 'Expiré'
    };
    return labels[status] || 'Inconnu';
  }

  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getUsagePercent(promo: PromoCode): number {
    return Math.round((promo.currentUses / promo.maxUses) * 100);
  }
}