package tn.esprit.microservice.subscriptionservice.subscription.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIRecommendationDTO {

    private Boolean shouldUpgrade;
    private Long recommendedPlanId;
    private String recommendedPlanName;
    private String recommendedTier;

    private Integer confidenceScore;
    private String urgencyLevel;

    private AIAnalysis aiAnalysis;
    private PeerComparison peerComparison;
    private ProjectedBenefits projectedBenefits;

    private String primaryCTA;
    private String secondaryCTA;

    private LocalDateTime generatedAt;
    private String modelVersion;
    private Integer tokensUsed;

    // ═══════════════════════════════════════════════════════════
    //  INNER CLASSES
    // ═══════════════════════════════════════════════════════════

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AIAnalysis {
        private String summary;
        private String detailedInsight;
        private List<RecommendationFactor> keyFactors;
        private String riskAssessment;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendationFactor {
        private String id;
        private String icon;
        private String title;
        private String description;
        private String impact; // positive, negative, neutral
        private Double weight;
        private FactorMetric metric;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FactorMetric {
        private String current;
        private String benchmark;
        private String trend; // up, down, stable
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeerComparison {
        private Integer similarUsersCount;
        private Integer avgUpgradeTime;
        private Integer successRateAfterUpgrade;
        private String topPerformersInsight;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectedBenefits {
        private Integer estimatedROI;
        private Integer additionalProjects;
        private Integer visibilityIncrease;
        private String timeToValue;
    }
}