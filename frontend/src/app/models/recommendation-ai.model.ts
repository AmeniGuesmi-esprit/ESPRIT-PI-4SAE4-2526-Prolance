// ══════════════════════════════════════════════════════════════
//  RECOMMENDATION IA - MODELS & INTERFACES
// ══════════════════════════════════════════════════════════════

// ─── Profil utilisateur pour l'embedding ───
export interface UserProfile {
  userId: number;
  userType: 'FREELANCER' | 'CLIENT';
  
  // Données d'abonnement
  currentPlanId: number;
  currentPlanName: string;
  currentTier: 'starter' | 'pro' | 'elite';
  subscriptionAgeDays: number;
  
  // Métriques d'usage
  projectsUsagePercent: number;
  proposalsUsagePercent: number;
  avgMonthlyProjects: number;
  avgMonthlyProposals: number;
  
  // Comportement
  loginFrequency: 'low' | 'medium' | 'high';
  lastLoginDays: number;
  conversionRate: number;
  
  // Churn
  churnScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Contexte business
  totalRevenue: number;
  lifetimeValue: number;
  supportTickets: number;
}

// ─── Embedding vectoriel ───
export interface UserEmbedding {
  userId: number;
  vector: number[]; // 1536 dimensions pour text-embedding-3-small
  createdAt: string;
  metadata: {
    planTier: string;
    userType: string;
    usageLevel: string;
  };
}

// ─── Utilisateurs similaires ───
export interface SimilarUser {
  userId: number;
  userName: string;
  userType: 'FREELANCER' | 'CLIENT';
  planName: string;
  planTier: 'starter' | 'pro' | 'elite';
  similarityScore: number; // 0-1 (cosine similarity)
  
  // Métriques de succès
  successMetrics: {
    projectsCompleted: number;
    revenueGenerated: number;
    satisfactionScore: number;
    upgradeHistory?: string[];
  };
}

// ─── Recommandation générée par l'IA ───
export interface AIRecommendation {
  // Recommandation principale
  shouldUpgrade: boolean;
  recommendedPlanId: number;
  recommendedPlanName: string;
  recommendedTier: 'starter' | 'pro' | 'elite';
  
  // Scores et confiance
  confidenceScore: number; // 0-100
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Analyse IA
  aiAnalysis: {
    summary: string; // Résumé court
    detailedInsight: string; // Analyse détaillée
    keyFactors: RecommendationFactor[];
    riskAssessment: string;
  };
  
  // Comparaison avec utilisateurs similaires
  peerComparison: {
    similarUsersCount: number;
    avgUpgradeTime: number; // jours moyens avant upgrade
    successRateAfterUpgrade: number;
    topPerformersInsight: string;
  };
  
  // Projections
  projectedBenefits: {
    estimatedROI: number;
    additionalProjects: number;
    visibilityIncrease: number;
    timeToValue: string;
  };
  
  // Call to action
  primaryCTA: string;
  secondaryCTA?: string;
  
  // Métadonnées
  generatedAt: string;
  modelVersion: string;
  tokensUsed: number;
}

// ─── Facteur de recommandation ───
export interface RecommendationFactor {
  id: string;
  icon: string;
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1
  metric?: {
    current: number | string;
    benchmark: number | string;
    trend: 'up' | 'down' | 'stable';
  };
}

// ─── Requête de recommandation ───
export interface RecommendationRequest {
  userId: number;
  includeDetailedAnalysis?: boolean;
  includePeerComparison?: boolean;
  forceRefresh?: boolean; // Ignorer le cache
}

// ─── Historique des recommandations ───
export interface RecommendationHistory {
  id: number;
  userId: number;
  recommendation: AIRecommendation;
  userAction: 'viewed' | 'clicked' | 'upgraded' | 'dismissed' | 'ignored';
  actionAt?: string;
  feedbackScore?: number; // 1-5
  feedbackComment?: string;
  createdAt: string;
}

// ─── Analytics des recommandations ───
export interface RecommendationAnalytics {
  period: string;
  
  // Volume
  totalRecommendations: number;
  uniqueUsers: number;
  
  // Performance
  viewRate: number;
  clickRate: number;
  conversionRate: number;
  avgConfidenceScore: number;
  
  // Par tier
  recommendationsByTier: {
    toStarter: number;
    toPro: number;
    toElite: number;
  };
  
  // Conversions
  conversions: {
    total: number;
    revenue: number;
    avgTimeToConvert: number;
  };
  
  // Feedback
  avgFeedbackScore: number;
  feedbackCount: number;
}

// ─── Configuration du moteur de recommandation ───
export interface RecommendationConfig {
  // OpenAI
  embeddingModel: string;
  completionModel: string;
  maxTokens: number;
  temperature: number;
  
  // Seuils
  thresholds: {
    minConfidenceToShow: number;
    highUrgencyChurnScore: number;
    minSimilarityScore: number;
    cacheExpirationHours: number;
  };
  
  // Feature flags
  features: {
    usePeerComparison: boolean;
    useChurnIntegration: boolean;
    showProjectedROI: boolean;
    enableABTesting: boolean;
  };
}