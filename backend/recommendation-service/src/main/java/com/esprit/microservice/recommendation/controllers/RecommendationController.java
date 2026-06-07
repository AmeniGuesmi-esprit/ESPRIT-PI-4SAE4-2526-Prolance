package com.esprit.microservice.recommendation.controllers;

import com.esprit.microservice.recommendation.dto.RecommendationDTO;
import com.esprit.microservice.recommendation.services.RecommendationImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final RecommendationImpl service;

    public RecommendationController(RecommendationImpl service) {
        this.service = service;
    }

    // Endpoint principal utilisé par Angular via l'API Gateway
    @GetMapping("/{userId}")
    public ResponseEntity<List<RecommendationDTO>> recommend(
            @PathVariable String userId,
            @RequestParam(defaultValue = "5") int n) {
        return ResponseEntity.ok(service.getRecommendations(userId, n));
    }
}
