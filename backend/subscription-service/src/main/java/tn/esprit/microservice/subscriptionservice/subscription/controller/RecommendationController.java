package tn.esprit.microservice.subscriptionservice.subscription.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.AIRecommendationDTO;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.UserProfileDTO;
import tn.esprit.microservice.subscriptionservice.subscription.service.RecommendationAIService;

@RestController
@RequestMapping("/subscription/api/recommendations")
@RequiredArgsConstructor

public class RecommendationController {

    private final RecommendationAIService recommendationService;

    /**
     * Génère une recommandation pour un utilisateur spécifique
     */
    @PostMapping("/generate/{userId}")
    public ResponseEntity<AIRecommendationDTO> generateRecommendation(@PathVariable Long userId) {
        return ResponseEntity.ok(recommendationService.generateRecommendation(userId));
    }

    /**
     * Récupère le profil utilisateur pour l'analyse
     */
    @GetMapping("/profile/{userId}")
    public ResponseEntity<UserProfileDTO> getUserProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(recommendationService.buildUserProfile(userId));
    }

    /**
     * Track une action utilisateur sur une recommandation
     */
    @PostMapping("/track/{recommendationId}")
    public ResponseEntity<Void> trackAction(
            @PathVariable Long recommendationId,
            @RequestParam String action) {
        recommendationService.trackUserAction(recommendationId, action);
        return ResponseEntity.ok().build();
    }

    /**
     * Soumet un feedback sur une recommandation
     */
    @PostMapping("/feedback/{recommendationId}")
    public ResponseEntity<Void> submitFeedback(
            @PathVariable Long recommendationId,
            @RequestParam Integer score,
            @RequestParam(required = false) String comment) {
        recommendationService.submitFeedback(recommendationId, score, comment);
        return ResponseEntity.ok().build();
    }
}