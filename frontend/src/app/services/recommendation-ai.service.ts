import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  UserProfile,
  AIRecommendation,
  RecommendationRequest,
  RecommendationHistory,
  RecommendationAnalytics,
  SimilarUser,
  RecommendationFactor,
} from '../models/recommendation-ai.model';

@Injectable({
  providedIn: 'root',
})
export class RecommendationAIService {
  private apiUrl = 'http://localhost:8222/api/recommendations';
  
  // Cache local pour éviter les appels répétés
  private recommendationCache = new Map<number, { data: AIRecommendation; timestamp: number }>();
  private cacheExpirationMs = 30 * 60 * 1000; // 30 minutes

  // État de chargement observable
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════════════════════════
  //  RECOMMANDATIONS
  // ══════════════════════════════════════════════════════════════

  /**
   * Obtient une recommandation IA personnalisée pour un utilisateur
   */
  getRecommendation(request: RecommendationRequest): Observable<AIRecommendation> {
    // Vérifier le cache
    if (!request.forceRefresh) {
      const cached = this.recommendationCache.get(request.userId);
      if (cached && Date.now() - cached.timestamp < this.cacheExpirationMs) {
        return of(cached.data);
      }
    }

    this.loadingSubject.next(true);

    return this.http.post<AIRecommendation>(`${this.apiUrl}/generate`, request).pipe(
      tap(recommendation => {
        // Mettre en cache
        this.recommendationCache.set(request.userId, {
          data: recommendation,
          timestamp: Date.now()
        });
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        console.error('Error fetching recommendation:', error);
        // Retourner une recommandation de fallback
        return of(this.getFallbackRecommendation());
      })
    );
  }

  /**
   * Obtient la recommandation pour l'utilisateur connecté
   */
  getMyRecommendation(forceRefresh = false): Observable<AIRecommendation> {
    this.loadingSubject.next(true);

    return this.http.get<AIRecommendation>(`${this.apiUrl}/me`, {
      params: { forceRefresh: forceRefresh.toString() }
    }).pipe(
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        this.loadingSubject.next(false);
        return of(this.getFallbackRecommendation());
      })
    );
  }

  /**
   * Rafraîchit la recommandation avec les dernières données
   */
  refreshRecommendation(userId: number): Observable<AIRecommendation> {
    this.recommendationCache.delete(userId);
    return this.getRecommendation({ userId, forceRefresh: true, includeDetailedAnalysis: true });
  }

  // ══════════════════════════════════════════════════════════════
  //  PROFIL UTILISATEUR & EMBEDDINGS
  // ══════════════════════════════════════════════════════════════

  /**
   * Récupère le profil complet d'un utilisateur pour l'analyse
   */
  getUserProfile(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile/${userId}`);
  }

  /**
   * Trouve les utilisateurs similaires basés sur les embeddings
   */
  getSimilarUsers(userId: number, limit = 5): Observable<SimilarUser[]> {
    return this.http.get<SimilarUser[]>(`${this.apiUrl}/similar-users/${userId}`, {
      params: { limit: limit.toString() }
    });
  }

  /**
   * Recalcule l'embedding d'un utilisateur (après changement significatif)
   */
  updateUserEmbedding(userId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/embeddings/update/${userId}`, {});
  }

  // ══════════════════════════════════════════════════════════════
  //  TRACKING & FEEDBACK
  // ══════════════════════════════════════════════════════════════

  /**
   * Enregistre une action utilisateur sur une recommandation
   */
  trackRecommendationAction(
    recommendationId: number,
    action: 'viewed' | 'clicked' | 'upgraded' | 'dismissed'
  ): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/track`, {
      recommendationId,
      action,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Envoie un feedback sur une recommandation
   */
  submitFeedback(
    recommendationId: number,
    score: number,
    comment?: string
  ): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/feedback`, {
      recommendationId,
      score,
      comment
    });
  }

  /**
   * Récupère l'historique des recommandations d'un utilisateur
   */
  getRecommendationHistory(userId: number): Observable<RecommendationHistory[]> {
    return this.http.get<RecommendationHistory[]>(`${this.apiUrl}/history/${userId}`);
  }

  // ══════════════════════════════════════════════════════════════
  //  ANALYTICS (ADMIN)
  // ══════════════════════════════════════════════════════════════

  /**
   * Récupère les analytics des recommandations
   */
  getAnalytics(period: 'week' | 'month' | 'quarter' = 'month'): Observable<RecommendationAnalytics> {
    return this.http.get<RecommendationAnalytics>(`${this.apiUrl}/analytics`, {
      params: { period }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  DEMO DATA (pour développement sans backend)
  // ══════════════════════════════════════════════════════════════

  /**
   * Génère une recommandation de démonstration réaliste
   */
  getDemoRecommendation(
    currentPlanName: string,
    userType: 'FREELANCER' | 'CLIENT'
  ): Observable<AIRecommendation> {
    this.loadingSubject.next(true);

    const currentTier = this.detectTier(currentPlanName);
    const recommendation = this.buildDemoAIRecommendation(currentTier, userType);

    // Simuler le délai d'appel API + génération IA
    return of(recommendation).pipe(
      delay(2500),
      tap(() => this.loadingSubject.next(false))
    );
  }

  private buildDemoAIRecommendation(
    currentTier: 'starter' | 'pro' | 'elite',
    userType: 'FREELANCER' | 'CLIENT'
  ): AIRecommendation {
    const isFreelancer = userType === 'FREELANCER';

    if (currentTier === 'elite') {
      return this.buildOptimalPlanRecommendation(isFreelancer);
    }

    if (currentTier === 'starter') {
      return this.buildStarterToProRecommendation(isFreelancer);
    }

    return this.buildProToEliteRecommendation(isFreelancer);
  }

  private buildStarterToProRecommendation(isFreelancer: boolean): AIRecommendation {
    const factors: RecommendationFactor[] = [
      {
        id: 'usage_limit',
        icon: '📊',
        title: 'Limite d\'usage atteinte',
        description: isFreelancer
          ? 'Vous utilisez 87% de vos propositions mensuelles depuis 3 mois consécutifs'
          : 'Vous avez publié 85% de vos projets autorisés ce mois',
        impact: 'negative',
        weight: 0.35,
        metric: {
          current: '87%',
          benchmark: '< 70%',
          trend: 'up'
        }
      },
      {
        id: 'conversion_rate',
        icon: '🎯',
        title: 'Taux de conversion exceptionnel',
        description: isFreelancer
          ? 'Votre taux de conversion (38%) est 2.4x supérieur à la moyenne'
          : 'Votre taux d\'embauche (45%) dépasse largement le benchmark (28%)',
        impact: 'positive',
        weight: 0.25,
        metric: {
          current: isFreelancer ? '38%' : '45%',
          benchmark: isFreelancer ? '16%' : '28%',
          trend: 'up'
        }
      },
      {
        id: 'similar_users',
        icon: '👥',
        title: 'Profils similaires ont upgradé',
        description: '94% des utilisateurs avec votre profil sont passés à Pro',
        impact: 'neutral',
        weight: 0.20,
        metric: {
          current: '94%',
          benchmark: 'similarity',
          trend: 'stable'
        }
      },
      {
        id: 'growth_potential',
        icon: '📈',
        title: 'Potentiel de croissance bloqué',
        description: isFreelancer
          ? 'Vous avez refusé ~12 opportunités ce mois par manque de quota'
          : '8 candidats qualifiés n\'ont pas pu postuler à vos offres',
        impact: 'negative',
        weight: 0.20,
        metric: {
          current: isFreelancer ? '12 opportunités' : '8 candidats',
          benchmark: '0',
          trend: 'up'
        }
      }
    ];

    return {
      shouldUpgrade: true,
      recommendedPlanId: 2,
      recommendedPlanName: isFreelancer ? 'Freelance Pro' : 'Business Pro',
      recommendedTier: 'pro',
      confidenceScore: 89,
      urgencyLevel: 'high',
      aiAnalysis: {
        summary: isFreelancer
          ? 'Votre activité dépasse largement les capacités du plan Starter. L\'upgrade vers Pro maximisera vos opportunités.'
          : 'Votre volume de recrutement nécessite les fonctionnalités Pro pour optimiser votre processus.',
        detailedInsight: isFreelancer
          ? `Après analyse de vos 127 jours d'activité, notre IA a identifié un pattern clair : vous êtes un power user contraint par les limites Starter. Votre taux de conversion exceptionnel (38% vs 16% moyenne) signifie que chaque proposition supplémentaire a une forte probabilité de se transformer en mission. En passant à Pro, vous débloquez des propositions illimitées et une visibilité x3, ce qui selon nos projections pourrait augmenter vos revenus de 180% dans les 60 prochains jours.`
          : `L'analyse de vos 95 jours d'utilisation révèle que votre processus de recrutement est mature mais bridé. Avec un taux d'embauche de 45%, vous convertissez efficacement les candidatures. Le passage à Pro vous donnera accès au matching IA, aux candidats prioritaires et à des analytics avancés. Les entreprises similaires à la vôtre réduisent leur temps de recrutement de 60% après upgrade.`,
        keyFactors: factors,
        riskAssessment: 'Risque faible. 92% des utilisateurs avec votre profil sont satisfaits après upgrade.'
      },
      peerComparison: {
        similarUsersCount: 847,
        avgUpgradeTime: 45,
        successRateAfterUpgrade: 94,
        topPerformersInsight: isFreelancer
          ? 'Les top freelancers Pro avec votre profil gagnent en moyenne 4,200€/mois (+180% vs Starter)'
          : 'Les entreprises Pro similaires recrutent 3x plus vite avec 40% de coûts réduits'
      },
      projectedBenefits: {
        estimatedROI: isFreelancer ? 340 : 280,
        additionalProjects: isFreelancer ? 8 : 12,
        visibilityIncrease: 180,
        timeToValue: '14 jours'
      },
      primaryCTA: 'Passer à Pro maintenant',
      secondaryCTA: 'Voir la comparaison détaillée',
      generatedAt: new Date().toISOString(),
      modelVersion: 'gpt-4-turbo-2024',
      tokensUsed: 1247
    };
  }

  private buildProToEliteRecommendation(isFreelancer: boolean): AIRecommendation {
    const factors: RecommendationFactor[] = [
      {
        id: 'max_usage',
        icon: '🚀',
        title: 'Utilisation maximale du Pro',
        description: 'Vous exploitez 100% des fonctionnalités Pro depuis 2 mois',
        impact: 'positive',
        weight: 0.30,
        metric: { current: '100%', benchmark: '65%', trend: 'stable' }
      },
      {
        id: 'top_performer',
        icon: '🏆',
        title: 'Top 5% des utilisateurs Pro',
        description: isFreelancer
          ? 'Votre activité vous place parmi les freelancers les plus performants'
          : 'Votre volume de recrutement est dans le top 5% des entreprises',
        impact: 'positive',
        weight: 0.25,
        metric: { current: 'Top 5%', benchmark: 'Top 50%', trend: 'up' }
      },
      {
        id: 'dedicated_support',
        icon: '🤝',
        title: 'Support dédié disponible',
        description: 'Elite inclut un account manager personnel pour optimiser votre stratégie',
        impact: 'positive',
        weight: 0.25,
        metric: { current: 'Non inclus', benchmark: 'Elite only', trend: 'stable' }
      }
    ];

    return {
      shouldUpgrade: true,
      recommendedPlanId: 3,
      recommendedPlanName: isFreelancer ? 'Freelance Elite' : 'Enterprise',
      recommendedTier: 'elite',
      confidenceScore: 72,
      urgencyLevel: 'medium',
      aiAnalysis: {
        summary: 'Vous maximisez déjà Pro. Elite vous donnerait un avantage compétitif supplémentaire.',
        detailedInsight: isFreelancer
          ? `En tant que top performer Pro, vous avez atteint un plateau. Les freelancers Elite avec votre profil génèrent en moyenne 4x plus de revenus grâce à la visibilité maximale, l'accès API et le support dédié. L'investissement Elite se rentabilise généralement en 3 semaines pour les profils comme le vôtre.`
          : `Votre volume de recrutement justifie les outils Enterprise : API d'intégration avec vos systèmes RH, gestion multi-utilisateurs et un recruitment manager dédié. Les entreprises similaires réduisent leurs coûts de recrutement de 45% avec Elite.`,
        keyFactors: factors,
        riskAssessment: 'Investissement plus élevé mais ROI démontré. Période d\'essai de 14 jours disponible.'
      },
      peerComparison: {
        similarUsersCount: 234,
        avgUpgradeTime: 67,
        successRateAfterUpgrade: 89,
        topPerformersInsight: 'Les utilisateurs Elite dans votre catégorie ont un revenu moyen 4x supérieur'
      },
      projectedBenefits: {
        estimatedROI: 420,
        additionalProjects: isFreelancer ? 15 : 25,
        visibilityIncrease: 320,
        timeToValue: '21 jours'
      },
      primaryCTA: 'Découvrir Elite',
      secondaryCTA: 'Parler à un conseiller',
      generatedAt: new Date().toISOString(),
      modelVersion: 'gpt-4-turbo-2024',
      tokensUsed: 1089
    };
  }

  private buildOptimalPlanRecommendation(isFreelancer: boolean): AIRecommendation {
    return {
      shouldUpgrade: false,
      recommendedPlanId: 3,
      recommendedPlanName: isFreelancer ? 'Freelance Elite' : 'Enterprise',
      recommendedTier: 'elite',
      confidenceScore: 15,
      urgencyLevel: 'low',
      aiAnalysis: {
        summary: 'Vous êtes sur le plan optimal ! Continuez à maximiser vos fonctionnalités Elite.',
        detailedInsight: `Notre analyse confirme que vous utilisez efficacement toutes les fonctionnalités Elite. Votre ROI actuel est de 340% sur votre investissement. Nous vous recommandons de continuer votre stratégie actuelle et d'explorer les nouvelles fonctionnalités bêta auxquelles vous avez accès en priorité.`,
        keyFactors: [
          {
            id: 'optimal',
            icon: '✅',
            title: 'Plan optimal atteint',
            description: 'Vous profitez de toutes les fonctionnalités premium disponibles',
            impact: 'positive',
            weight: 1.0
          }
        ],
        riskAssessment: 'Aucun risque identifié. Continuez votre excellente utilisation.'
      },
      peerComparison: {
        similarUsersCount: 89,
        avgUpgradeTime: 0,
        successRateAfterUpgrade: 100,
        topPerformersInsight: 'Vous faites partie des top performers Elite !'
      },
      projectedBenefits: {
        estimatedROI: 0,
        additionalProjects: 0,
        visibilityIncrease: 0,
        timeToValue: 'N/A'
      },
      primaryCTA: 'Explorer les fonctionnalités bêta',
      generatedAt: new Date().toISOString(),
      modelVersion: 'gpt-4-turbo-2024',
      tokensUsed: 456
    };
  }

  private getFallbackRecommendation(): AIRecommendation {
    return {
      shouldUpgrade: false,
      recommendedPlanId: 0,
      recommendedPlanName: 'Actuel',
      recommendedTier: 'starter',
      confidenceScore: 0,
      urgencyLevel: 'low',
      aiAnalysis: {
        summary: 'Impossible de générer une recommandation pour le moment.',
        detailedInsight: 'Veuillez réessayer ultérieurement ou contacter le support.',
        keyFactors: [],
        riskAssessment: 'N/A'
      },
      peerComparison: {
        similarUsersCount: 0,
        avgUpgradeTime: 0,
        successRateAfterUpgrade: 0,
        topPerformersInsight: ''
      },
      projectedBenefits: {
        estimatedROI: 0,
        additionalProjects: 0,
        visibilityIncrease: 0,
        timeToValue: 'N/A'
      },
      primaryCTA: 'Réessayer',
      generatedAt: new Date().toISOString(),
      modelVersion: 'fallback',
      tokensUsed: 0
    };
  }

  private detectTier(planName: string): 'starter' | 'pro' | 'elite' {
    const n = planName.toLowerCase();
    if (n.includes('elite') || n.includes('enterprise')) return 'elite';
    if (n.includes('pro') || n.includes('premium') || n.includes('business')) return 'pro';
    return 'starter';
  }

  // Vider le cache
  clearCache(): void {
    this.recommendationCache.clear();
  }
}