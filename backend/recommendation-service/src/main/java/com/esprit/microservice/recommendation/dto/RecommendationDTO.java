package com.esprit.microservice.recommendation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationDTO {
    private String eventId;
    private String eventName;
    private String category;
    private String level;
    private String format;
    private Double avgRating;
    private Double hybridScore;
}
