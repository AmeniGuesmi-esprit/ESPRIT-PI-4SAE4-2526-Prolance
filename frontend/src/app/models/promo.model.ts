export interface PromoCode {
  id: number;
  code: string;
  discountPercent: number;
  description: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
}

export interface PromoRecommendation {
  id: number;
  code: string;
  discountPercent: number;
  description: string;
  expiresAt: string;
  remainingUses: number;
  aiReason: string;
  relevanceScore: number;
  targetAudience: string;
  isPersonalized: boolean;
}

export interface PromoRecommendationResponse {
  success: boolean;
  recommendations: PromoRecommendation[];
  totalFound: number;
  generatedAt: string;
  aiModel: string;
}

export interface PromoStats {
  totalPromos: number;
  activePromos: number;
  totalUsages: number;
  averageDiscount: number;
}