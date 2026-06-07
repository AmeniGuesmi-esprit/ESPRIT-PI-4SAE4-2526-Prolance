package tn.esprit.microservice.subscriptionservice.subscription.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDTO {

    private Long userId;
    private String userType; // FREELANCER ou CLIENT

    // Subscription info
    private Long currentPlanId;
    private String currentPlanName;
    private String currentTier; // starter, pro, elite
    private Integer subscriptionAgeDays;

    // Usage metrics
    private Integer projectsUsagePercent;
    private Integer proposalsUsagePercent;
    private Double avgMonthlyProjects;
    private Double avgMonthlyProposals;

    // Behavior
    private String loginFrequency; // low, medium, high
    private Integer lastLoginDays;
    private Double conversionRate;

    // Churn
    private Integer churnScore;
    private String riskLevel;

    // Business
    private Double totalRevenue;
    private Double lifetimeValue;
    private Integer supportTickets;

    /**
     * Convertit le profil en texte pour l'embedding OpenAI
     */
    public String toEmbeddingText() {
        return String.format("""
            User type: %s
            Current plan: %s (tier: %s)
            Account age: %d days
            Projects usage: %d%% of quota
            Proposals usage: %d%% of quota
            Average monthly projects: %.1f
            Average monthly proposals: %.1f
            Login frequency: %s
            Days since last login: %d
            Conversion rate: %.1f%%
            Churn risk score: %d (%s)
            Total revenue generated: %.2f
            Lifetime value: %.2f
            Support tickets: %d
            """,
                userType != null ? userType : "UNKNOWN",
                currentPlanName != null ? currentPlanName : "N/A",
                currentTier != null ? currentTier : "starter",
                subscriptionAgeDays != null ? subscriptionAgeDays : 0,
                projectsUsagePercent != null ? projectsUsagePercent : 0,
                proposalsUsagePercent != null ? proposalsUsagePercent : 0,
                avgMonthlyProjects != null ? avgMonthlyProjects : 0.0,
                avgMonthlyProposals != null ? avgMonthlyProposals : 0.0,
                loginFrequency != null ? loginFrequency : "low",
                lastLoginDays != null ? lastLoginDays : 0,
                conversionRate != null ? conversionRate : 0.0,
                churnScore != null ? churnScore : 0,
                riskLevel != null ? riskLevel : "LOW",
                totalRevenue != null ? totalRevenue : 0.0,
                lifetimeValue != null ? lifetimeValue : 0.0,
                supportTickets != null ? supportTickets : 0
        );
    }
}