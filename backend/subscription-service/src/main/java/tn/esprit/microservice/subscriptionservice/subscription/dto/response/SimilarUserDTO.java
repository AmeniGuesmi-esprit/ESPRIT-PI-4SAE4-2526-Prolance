package tn.esprit.microservice.subscriptionservice.subscription.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimilarUserDTO {

    private Long userId;
    private Double similarityScore;
    private String planTier;
    private String userName;
    private String userType;

    // Métriques de succès optionnelles
    private Integer projectsCompleted;
    private Double revenueGenerated;
    private Double satisfactionScore;
}