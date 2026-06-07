// ── Backend Enum Types ──────────────────────────
export type AdType = 'BANNER' | 'FEATURED_PROFILE' | 'JOB_BOOST';
export type AdLocation = 'LANDING_PAGE' | 'JOB_FEED' | 'SEARCH_SIDEBAR';
export type CampaignStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED';
export type RoleType = 'FREELANCER' | 'CLIENT';
export type AdCreationOrigin = 'AI' | 'HUMAN';
export type AdEventType = 'VIEW' | 'CLICK' | 'HOVER';

// ── Plan DTO (GET /plans) ───────────────────────
export interface AdPlan {
  readonly id: number;
  readonly name: string;
  readonly type: AdType;
  readonly price: number;
  readonly location: AdLocation;
  readonly roleType: RoleType;
  readonly description?: string;
  icon?: string;
}

// ── Campaign DTO (GET /campaigns) ───────────────
export interface AdCampaign {
  readonly id: number;
  readonly userId: number;
  readonly planId: number;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly targetUrl: string;
  status: CampaignStatus;
  rejectionReason?: string;
  readonly createdAt: Date | string;
  roleType: RoleType;
  readonly targetId?: number;
  readonly createdBy?: AdCreationOrigin;
  readonly planName?: string;
  readonly planType?: AdType;
  readonly planLocation?: AdLocation;
  readonly views?: number;
  readonly clicks?: number;
  sparklineData?: number[];
}

// ── Request DTOs ────────────────────────────────
export interface CreateCampaignRequest {
  readonly planId: number;
  readonly title: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly targetUrl: string;
  readonly roleType: RoleType;
  readonly targetId?: number;
  readonly usedAiSuggestion?: boolean;
}

export interface RejectCampaignRequest {
  readonly rejectionReason: string;
}

// ── Response DTOs ───────────────────────────────
export interface ContentValidationResponse {
  readonly isSafe: boolean;
  readonly categoryCode?: string;
}

export interface AiSuggestionResponse {
  readonly title: string;
  readonly description: string;
}

export interface AdContactResponse {
  readonly adId: number;
  readonly adTitle: string;
  readonly email: string;
}

// ── RAG (Retrieval-Augmented Generation) ────────
export interface RagRelevantAd {
  readonly adId: number;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly roleType: string;
  readonly planName: string;
  readonly score: number;
}

export interface RagResponse {
  readonly answer: string;
  readonly relevantAds: RagRelevantAd[];
}
