import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

// ══════════════════════════════════════
//  INTERFACES
// ══════════════════════════════════════

export interface UsageAnalysis {
  projectsUsagePercent: number;
  proposalsUsagePercent: number;
  avgMonthlyProjects: number;
  avgMonthlyProposals: number;
  consecutiveHighUsageMonths: number;
  accountAgeDays: number;
  loginFrequency: 'low' | 'medium' | 'high';
  conversionRate: number;
}

export interface PlanRecommendation {
  shouldUpgrade: boolean;
  recommendedPlan: string;
  recommendedTier: 'starter' | 'pro' | 'elite';
  confidenceScore: number;
  reasons: RecommendationReason[];
  estimatedBenefit: string;
  monthlySavings: number | null;
  aiInsight: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface RecommendationReason {
  icon: string;
  title: string;
  description: string;
  metric: string;
  severity: 'info' | 'warning' | 'critical';
}

@Injectable({
  providedIn: 'root',
})
export class RecommendationService {

  /**
   * Returns AI-powered plan recommendation.
   * Uses realistic demo data for presentation purposes.
   * In production, this would call: GET /api/subscriptions/me/recommendation
   */
  getRecommendation(
    currentPlanName: string,
    userType: 'FREELANCER' | 'CLIENT'
  ): Observable<PlanRecommendation> {

    const currentTier = this.detectTier(currentPlanName);
    const recommendation = this.buildDemoRecommendation(currentTier, userType);

    // Simulate API delay (feels more "AI-like")
    return of(recommendation).pipe(delay(1800));
  }

  /**
   * Returns usage analytics for the recommendation card.
   */
  getUsageAnalysis(userType: 'FREELANCER' | 'CLIENT'): Observable<UsageAnalysis> {
    const mockAnalysis: UsageAnalysis = userType === 'FREELANCER'
      ? {
          projectsUsagePercent: 78,
          proposalsUsagePercent: 85,
          avgMonthlyProjects: 4.2,
          avgMonthlyProposals: 18.7,
          consecutiveHighUsageMonths: 3,
          accountAgeDays: 127,
          loginFrequency: 'high',
          conversionRate: 34,
        }
      : {
          projectsUsagePercent: 72,
          proposalsUsagePercent: 88,
          avgMonthlyProjects: 6.1,
          avgMonthlyProposals: 23.4,
          consecutiveHighUsageMonths: 4,
          accountAgeDays: 95,
          loginFrequency: 'high',
          conversionRate: 41,
        };

    return of(mockAnalysis).pipe(delay(800));
  }

  // ══════════════════════════════════════
  //  DEMO RECOMMENDATION BUILDER
  // ══════════════════════════════════════

  private buildDemoRecommendation(
    currentTier: 'starter' | 'pro' | 'elite',
    userType: 'FREELANCER' | 'CLIENT'
  ): PlanRecommendation {

    // ─── ELITE users: already on the best plan ───
    if (currentTier === 'elite') {
      return {
        shouldUpgrade: false,
        recommendedPlan: 'Elite',
        recommendedTier: 'elite',
        confidenceScore: 15,
        reasons: [],
        estimatedBenefit: 'You already have access to all premium features',
        monthlySavings: null,
        aiInsight: 'You\'re on our most powerful plan. Your usage is optimized and you have access to all features. Keep up the great work!',
        urgency: 'low',
      };
    }

    // ─── STARTER users → recommend PRO ───
    if (currentTier === 'starter') {
      return this.buildStarterToProRecommendation(userType);
    }

    // ─── PRO users → recommend ELITE ───
    return this.buildProToEliteRecommendation(userType);
  }

  private buildStarterToProRecommendation(userType: 'FREELANCER' | 'CLIENT'): PlanRecommendation {
    const isFreelancer = userType === 'FREELANCER';

    const reasons: RecommendationReason[] = [
      {
        icon: '📨',
        title: 'Proposal Limit Nearly Reached',
        description: isFreelancer
          ? 'You\'ve used 85% of your monthly proposals for 3 consecutive months. You\'re missing opportunities!'
          : 'You\'ve received 88% of your maximum proposals. You could attract even more qualified candidates.',
        metric: isFreelancer ? '85%' : '88%',
        severity: 'critical',
      },
      {
        icon: '📁',
        title: 'Project Capacity Filling Up',
        description: isFreelancer
          ? '78% of your project slots are used. At this rate, you\'ll hit the limit within 3 weeks.'
          : '72% of your job listings are filled. The Pro plan triples your capacity.',
        metric: isFreelancer ? '78%' : '72%',
        severity: 'warning',
      },
      {
        icon: '🎯',
        title: 'Excellent Conversion Rate',
        description: isFreelancer
          ? 'Your 34% conversion rate is 2x above average. More proposals = significantly more projects for you.'
          : 'Your 41% hiring rate is exceptional. With more listings, you could build your team faster.',
        metric: isFreelancer ? '34%' : '41%',
        severity: 'info',
      },
      {
        icon: '🔥',
        title: 'Power User Detected',
        description: 'Your activity pattern matches our most successful Pro users. You\'re leaving value on the table with Starter.',
        metric: 'High',
        severity: 'info',
      },
      {
        icon: '📅',
        title: 'Time to Level Up',
        description: isFreelancer
          ? 'You\'ve been on Starter for 127 days. Top freelancers upgrade within 60 days on average.'
          : 'You\'ve been on Starter for 95 days. Companies with Pro plan fill positions 60% faster.',
        metric: isFreelancer ? '127d' : '95d',
        severity: 'warning',
      },
    ];

    return {
      shouldUpgrade: true,
      recommendedPlan: isFreelancer ? 'Freelance Pro' : 'Premium',
      recommendedTier: 'pro',
      confidenceScore: 87,
      reasons,
      estimatedBenefit: isFreelancer
        ? 'Estimated +180% visibility & 3x more project opportunities'
        : 'Estimated 60% faster hiring & 3x more qualified candidates',
      monthlySavings: null,
      aiInsight: isFreelancer
        ? 'Based on your activity over the last 3 months, you\'ve consistently used over 85% of your proposals. Upgrading to the Pro plan would give you unlimited proposals and increase your visibility by 180%. Freelancers who upgrade at your stage see a 3x increase in project offers within the first month.'
        : 'Based on your hiring patterns over the last 4 months, you\'ve used 88% of your proposal capacity. Upgrading to the Premium plan would give you AI matching, priority candidates, and reduce your average time-to-hire by 60%. Companies who upgrade at your stage fill positions 3x faster.',
      urgency: 'high',
    };
  }

  private buildProToEliteRecommendation(userType: 'FREELANCER' | 'CLIENT'): PlanRecommendation {
    const isFreelancer = userType === 'FREELANCER';

    const reasons: RecommendationReason[] = [
      {
        icon: '🚀',
        title: 'You\'re Outgrowing Pro',
        description: isFreelancer
          ? 'You\'ve maxed out Pro features 2 months in a row. Elite gives you unlimited everything + dedicated manager.'
          : 'Your recruitment volume exceeds typical Pro usage. Elite gives you API access + multi-user team management.',
        metric: '2 months',
        severity: 'warning',
      },
      {
        icon: '📊',
        title: 'Top Performer',
        description: isFreelancer
          ? 'You\'re in the top 8% of Pro freelancers by activity. Elite members earn 4x more on average.'
          : 'You\'re in the top 5% of Pro clients by hiring volume. Elite companies fill positions 80% faster.',
        metric: 'Top 8%',
        severity: 'info',
      },
      {
        icon: '🤝',
        title: 'Dedicated Manager Available',
        description: 'With Elite, you get a dedicated account manager who optimizes your strategy and provides personalized support.',
        metric: 'VIP',
        severity: 'info',
      },
    ];

    return {
      shouldUpgrade: true,
      recommendedPlan: isFreelancer ? 'Freelance Elite' : 'Elite',
      recommendedTier: 'elite',
      confidenceScore: 72,
      reasons,
      estimatedBenefit: isFreelancer
        ? 'Estimated +320% visibility & 5x more project opportunities'
        : 'Estimated 80% faster hiring & unlimited candidate access',
      monthlySavings: null,
      aiInsight: isFreelancer
        ? 'You\'re already a top performer on Pro. In the last 2 months, you\'ve consistently hit your limits. Elite members earn 4x more on average thanks to unlimited projects, maximum visibility, and a dedicated success manager. Your profile suggests a strong ROI on upgrading.'
        : 'Your hiring volume has grown significantly on Pro. Elite gives you API integration with your HR tools, multi-user team access, and a dedicated recruitment manager. Companies at your level see an 80% reduction in time-to-hire.',
      urgency: 'medium',
    };
  }

  private detectTier(planName: string): 'starter' | 'pro' | 'elite' {
    const n = planName.toLowerCase();
    if (n.includes('elite') || n.includes('enterprise')) return 'elite';
    if (n.includes('pro') || n.includes('premium') || n.includes('business')) return 'pro';
    return 'starter';
  }
}