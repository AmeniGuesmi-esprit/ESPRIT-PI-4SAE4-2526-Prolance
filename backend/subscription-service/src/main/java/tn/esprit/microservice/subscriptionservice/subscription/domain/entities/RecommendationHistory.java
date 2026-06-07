package tn.esprit.microservice.subscriptionservice.subscription.domain.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "recommendation_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "recommended_plan_id")
    private Long recommendedPlanId;

    @Column(name = "recommended_plan_name", length = 100)
    private String recommendedPlanName;

    @Column(name = "confidence_score")
    private Integer confidenceScore;

    @Column(name = "urgency_level", length = 20)
    private String urgencyLevel;

    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    @Column(name = "ai_detailed_insight", columnDefinition = "TEXT")
    private String aiDetailedInsight;

    @Column(name = "projected_roi")
    private Integer projectedRoi;

    @Column(name = "tokens_used")
    private Integer tokensUsed;

    @Column(name = "model_version", length = 50)
    private String modelVersion;

    // User action tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "user_action")
    private UserAction userAction;

    @Column(name = "action_at")
    private LocalDateTime actionAt;

    @Column(name = "feedback_score")
    private Integer feedbackScore;

    @Column(name = "feedback_comment", columnDefinition = "TEXT")
    private String feedbackComment;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (userAction == null) {
            userAction = UserAction.GENERATED;
        }
    }

    public enum UserAction {
        GENERATED, VIEWED, CLICKED, UPGRADED, DISMISSED, IGNORED
    }
}