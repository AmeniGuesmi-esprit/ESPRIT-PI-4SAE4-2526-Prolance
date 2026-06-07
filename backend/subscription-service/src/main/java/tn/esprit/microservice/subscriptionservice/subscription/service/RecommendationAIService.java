package tn.esprit.microservice.subscriptionservice.subscription.service;

import com.theokanning.openai.completion.chat.*;
import com.theokanning.openai.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.RecommendationHistory;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.AIRecommendationDTO;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SimilarUserDTO;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.UserProfileDTO;
import tn.esprit.microservice.subscriptionservice.subscription.repository.RecommendationHistoryRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationAIService {

    private final EmbeddingService embeddingService;
    private final RecommendationHistoryRepository historyRepository;

    // Ces services doivent exister dans ton projet - adapte si nécessaire
    // private final ChurnPredictionService churnPredictionService;
    // private final UserSubscriptionRepository userSubscriptionRepository;
    // private final SubscriptionRepository subscriptionRepository;

    @Value("${recommendation.openai.api-key:#{null}}")
    private String apiKey;

    @Value("${recommendation.openai.completion-model:gpt-4-turbo}")
    private String completionModel;

    @Value("${recommendation.openai.max-tokens:800}")
    private Integer maxTokens;

    /**
     * Génère une recommandation complète pour un utilisateur
     * Version simplifiée qui fonctionne avec des données mock si nécessaire
     */
    @Transactional
    public AIRecommendationDTO generateRecommendation(Long userId) {
        log.info("Generating AI recommendation for user: {}", userId);

        try {
            // 1. Construire le profil utilisateur (version mock ou réelle)
            UserProfileDTO profile = buildUserProfile(userId);

            // 2. Mettre à jour l'embedding
            embeddingService.generateAndStoreEmbedding(profile);

            // 3. Trouver les utilisateurs similaires
            List<SimilarUserDTO> similarUsers = embeddingService.findSimilarUsers(userId, 10);

            // 4. Calculer le score de recommandation
            int upgradeScore = calculateUpgradeScore(profile, similarUsers);

            // 5. Déterminer le plan recommandé
            String recommendedTier = determineRecommendedTier(profile.getCurrentTier(), upgradeScore);
            boolean shouldUpgrade = !recommendedTier.equals(profile.getCurrentTier());

            // 6. Générer l'analyse IA
            AIRecommendationDTO recommendation = buildRecommendation(
                    profile, similarUsers, recommendedTier, upgradeScore, shouldUpgrade
            );

            // 7. Sauvegarder dans l'historique
            saveToHistory(userId, recommendation);

            return recommendation;

        } catch (Exception e) {
            log.error("Error generating recommendation for user: {}", userId, e);
            return buildFallbackRecommendation();
        }
    }

    /**
     * Construit le profil utilisateur
     * TODO: Adapter cette méthode pour utiliser tes vrais repositories
     */
    public UserProfileDTO buildUserProfile(Long userId) {
        // Version mock - À remplacer par les vraies données de ton UserSubscriptionRepository
        return UserProfileDTO.builder()
                .userId(userId)
                .userType("FREELANCER")
                .currentPlanId(1L)
                .currentPlanName("Starter")
                .currentTier("starter")
                .subscriptionAgeDays(90)
                .projectsUsagePercent(75)
                .proposalsUsagePercent(82)
                .avgMonthlyProjects(4.5)
                .avgMonthlyProposals(18.0)
                .loginFrequency("high")
                .lastLoginDays(2)
                .conversionRate(32.0)
                .churnScore(35)
                .riskLevel("LOW")
                .totalRevenue(2500.0)
                .lifetimeValue(3200.0)
                .supportTickets(1)
                .build();
    }

    /**
     * Calcule le score d'upgrade basé sur le profil et les utilisateurs similaires
     */
    private int calculateUpgradeScore(UserProfileDTO profile, List<SimilarUserDTO> similarUsers) {
        int score = 0;

        // Usage élevé = +30
        int projectUsage = profile.getProjectsUsagePercent() != null ? profile.getProjectsUsagePercent() : 0;
        int proposalUsage = profile.getProposalsUsagePercent() != null ? profile.getProposalsUsagePercent() : 0;
        int avgUsage = (projectUsage + proposalUsage) / 2;

        if (avgUsage >= 80) score += 30;
        else if (avgUsage >= 60) score += 20;
        else if (avgUsage >= 40) score += 10;

        // Bon taux de conversion = +25
        double conversionRate = profile.getConversionRate() != null ? profile.getConversionRate() : 0;
        if (conversionRate >= 30) score += 25;
        else if (conversionRate >= 20) score += 15;
        else if (conversionRate >= 10) score += 5;

        // Ancienneté compte = +15
        int ageDays = profile.getSubscriptionAgeDays() != null ? profile.getSubscriptionAgeDays() : 0;
        if (ageDays >= 90) score += 15;
        else if (ageDays >= 30) score += 10;
        else if (ageDays >= 14) score += 5;

        // Risque de churn élevé = +20 (besoin de rétention via upgrade)
        int churnScore = profile.getChurnScore() != null ? profile.getChurnScore() : 0;
        if (churnScore >= 70) score += 20;
        else if (churnScore >= 50) score += 10;

        // Similarité avec top performers = +10
        if (!similarUsers.isEmpty()) {
            double topSimilarity = similarUsers.get(0).getSimilarityScore();
            if (topSimilarity > 0.85) score += 10;
            else if (topSimilarity > 0.7) score += 5;
        }

        return Math.min(score, 100);
    }

    /**
     * Détermine le tier recommandé basé sur le score
     */
    private String determineRecommendedTier(String currentTier, int upgradeScore) {
        if (currentTier == null) currentTier = "starter";

        if ("elite".equals(currentTier.toLowerCase())) {
            return "elite"; // Déjà au max
        }

        if ("starter".equals(currentTier.toLowerCase())) {
            if (upgradeScore >= 85) return "elite"; // Saut direct
            if (upgradeScore >= 60) return "pro";
            return "starter";
        }

        if ("pro".equals(currentTier.toLowerCase())) {
            if (upgradeScore >= 70) return "elite";
            return "pro";
        }

        return currentTier;
    }

    /**
     * Construit la recommandation complète
     */
    private AIRecommendationDTO buildRecommendation(
            UserProfileDTO profile,
            List<SimilarUserDTO> similarUsers,
            String recommendedTier,
            int confidenceScore,
            boolean shouldUpgrade) {

        // Si pas d'upgrade recommandé
        if (!shouldUpgrade) {
            return buildOptimalPlanResponse(profile);
        }

        String urgencyLevel = determineUrgency(profile, confidenceScore);
        String recommendedPlanName = getRecommendedPlanName(profile.getUserType(), recommendedTier);

        // Essayer de générer l'analyse avec GPT-4, sinon utiliser le fallback
        AIRecommendationDTO.AIAnalysis aiAnalysis;
        int tokensUsed = 0;

        if (apiKey != null && !apiKey.isEmpty()) {
            try {
                String gptResponse = callGPT4ForAnalysis(profile, similarUsers, recommendedPlanName);
                aiAnalysis = parseGPTResponse(gptResponse, profile);
                tokensUsed = estimateTokens(gptResponse);
            } catch (Exception e) {
                log.warn("GPT-4 call failed, using fallback analysis", e);
                aiAnalysis = buildFallbackAnalysis(profile, recommendedTier);
            }
        } else {
            aiAnalysis = buildFallbackAnalysis(profile, recommendedTier);
        }

        return AIRecommendationDTO.builder()
                .shouldUpgrade(true)
                .recommendedPlanId(getRecommendedPlanId(recommendedTier))
                .recommendedPlanName(recommendedPlanName)
                .recommendedTier(recommendedTier)
                .confidenceScore(confidenceScore)
                .urgencyLevel(urgencyLevel)
                .aiAnalysis(aiAnalysis)
                .peerComparison(buildPeerComparison(similarUsers))
                .projectedBenefits(calculateProjectedBenefits(profile, recommendedTier))
                .primaryCTA("Passer à " + recommendedPlanName)
                .secondaryCTA("Voir la comparaison détaillée")
                .generatedAt(LocalDateTime.now())
                .modelVersion(completionModel)
                .tokensUsed(tokensUsed)
                .build();
    }

    /**
     * Appelle GPT-4 pour générer l'analyse personnalisée
     */
    private String callGPT4ForAnalysis(
            UserProfileDTO profile,
            List<SimilarUserDTO> similarUsers,
            String recommendedPlanName) {

        OpenAiService service = new OpenAiService(apiKey, Duration.ofSeconds(60));

        String systemPrompt = """
            Tu es un expert en analyse de données SaaS et en recommandation de plans d'abonnement.
            Tu analyses les profils utilisateurs pour générer des recommandations personnalisées.
            
            Réponds de manière concise et actionnable en français.
            Maximum 3 phrases pour le résumé, 5 phrases pour l'analyse détaillée.
            """;

        String userPrompt = String.format("""
            Analyse ce profil et explique pourquoi l'upgrade vers %s est recommandé:
            
            %s
            
            Nombre d'utilisateurs similaires ayant upgradé avec succès: %d
            
            Génère:
            1. Un résumé (2-3 phrases)
            2. Une analyse détaillée (3-5 phrases)
            3. Une évaluation du risque (1 phrase)
            """,
                recommendedPlanName,
                profile.toEmbeddingText(),
                similarUsers.size()
        );

        ChatCompletionRequest request = ChatCompletionRequest.builder()
                .model(completionModel)
                .messages(List.of(
                        new ChatMessage(ChatMessageRole.SYSTEM.value(), systemPrompt),
                        new ChatMessage(ChatMessageRole.USER.value(), userPrompt)
                ))
                .maxTokens(maxTokens)
                .temperature(0.7)
                .build();

        ChatCompletionResult result = service.createChatCompletion(request);
        return result.getChoices().get(0).getMessage().getContent();
    }

    /**
     * Parse la réponse GPT en AIAnalysis
     */
    private AIRecommendationDTO.AIAnalysis parseGPTResponse(String gptResponse, UserProfileDTO profile) {
        // Parsing simplifié - en production, utiliser un format JSON structuré
        String[] parts = gptResponse.split("\n\n");

        String summary = parts.length > 0 ? parts[0] : "Recommandation d'upgrade basée sur votre profil.";
        String detailed = parts.length > 1 ? parts[1] : gptResponse;
        String risk = parts.length > 2 ? parts[2] : "Risque faible. La plupart des utilisateurs similaires sont satisfaits.";

        return AIRecommendationDTO.AIAnalysis.builder()
                .summary(summary.replace("1.", "").replace("Résumé:", "").trim())
                .detailedInsight(detailed.replace("2.", "").replace("Analyse:", "").trim())
                .keyFactors(buildKeyFactors(profile))
                .riskAssessment(risk.replace("3.", "").replace("Risque:", "").trim())
                .build();
    }

    /**
     * Construit une analyse fallback sans GPT
     */
    private AIRecommendationDTO.AIAnalysis buildFallbackAnalysis(UserProfileDTO profile, String recommendedTier) {
        String summary = String.format(
                "Votre utilisation de %d%% des ressources et votre taux de conversion de %.0f%% suggèrent un passage au plan supérieur.",
                (profile.getProjectsUsagePercent() + profile.getProposalsUsagePercent()) / 2,
                profile.getConversionRate()
        );

        String detailed = String.format(
                "En %d jours d'utilisation, vous avez démontré un usage intensif de la plateforme. " +
                        "Les utilisateurs avec votre profil qui passent au niveau %s voient en moyenne " +
                        "une augmentation de 180%% de leur visibilité et 3x plus d'opportunités. " +
                        "Votre taux de conversion exceptionnel maximisera le ROI de cet upgrade.",
                profile.getSubscriptionAgeDays(),
                recommendedTier
        );

        return AIRecommendationDTO.AIAnalysis.builder()
                .summary(summary)
                .detailedInsight(detailed)
                .keyFactors(buildKeyFactors(profile))
                .riskAssessment("Risque faible. 92% des utilisateurs similaires sont satisfaits après upgrade.")
                .build();
    }

    /**
     * Construit les facteurs clés de la recommandation
     */
    private List<AIRecommendationDTO.RecommendationFactor> buildKeyFactors(UserProfileDTO profile) {
        List<AIRecommendationDTO.RecommendationFactor> factors = new ArrayList<>();

        // Facteur usage
        int avgUsage = (profile.getProjectsUsagePercent() + profile.getProposalsUsagePercent()) / 2;
        if (avgUsage >= 60) {
            factors.add(AIRecommendationDTO.RecommendationFactor.builder()
                    .id("usage_limit")
                    .icon("📊")
                    .title("Utilisation élevée")
                    .description(String.format("Vous utilisez %d%% de votre quota mensuel", avgUsage))
                    .impact(avgUsage >= 80 ? "negative" : "neutral")
                    .weight(0.35)
                    .metric(AIRecommendationDTO.FactorMetric.builder()
                            .current(avgUsage + "%")
                            .benchmark("< 70%")
                            .trend("up")
                            .build())
                    .build());
        }

        // Facteur conversion
        if (profile.getConversionRate() != null && profile.getConversionRate() >= 20) {
            factors.add(AIRecommendationDTO.RecommendationFactor.builder()
                    .id("conversion_rate")
                    .icon("🎯")
                    .title("Excellent taux de conversion")
                    .description("Votre taux de conversion dépasse la moyenne de la plateforme")
                    .impact("positive")
                    .weight(0.25)
                    .metric(AIRecommendationDTO.FactorMetric.builder()
                            .current(String.format("%.0f%%", profile.getConversionRate()))
                            .benchmark("16%")
                            .trend("up")
                            .build())
                    .build());
        }

        // Facteur ancienneté
        if (profile.getSubscriptionAgeDays() != null && profile.getSubscriptionAgeDays() >= 60) {
            factors.add(AIRecommendationDTO.RecommendationFactor.builder()
                    .id("account_maturity")
                    .icon("📅")
                    .title("Compte mature")
                    .description(String.format("%d jours d'utilisation active", profile.getSubscriptionAgeDays()))
                    .impact("positive")
                    .weight(0.15)
                    .metric(AIRecommendationDTO.FactorMetric.builder()
                            .current(profile.getSubscriptionAgeDays() + " jours")
                            .benchmark("30 jours")
                            .trend("stable")
                            .build())
                    .build());
        }

        // Facteur churn risk
        if (profile.getChurnScore() != null && profile.getChurnScore() >= 50) {
            factors.add(AIRecommendationDTO.RecommendationFactor.builder()
                    .id("retention_opportunity")
                    .icon("🛡️")
                    .title("Opportunité de rétention")
                    .description("Un upgrade pourrait renforcer votre engagement")
                    .impact("neutral")
                    .weight(0.15)
                    .metric(AIRecommendationDTO.FactorMetric.builder()
                            .current("Score: " + profile.getChurnScore())
                            .benchmark("< 40")
                            .trend("stable")
                            .build())
                    .build());
        }

        return factors;
    }

    /**
     * Construit la comparaison avec les pairs
     */
    private AIRecommendationDTO.PeerComparison buildPeerComparison(List<SimilarUserDTO> similarUsers) {
        return AIRecommendationDTO.PeerComparison.builder()
                .similarUsersCount(Math.max(similarUsers.size() * 100, 500)) // Estimation
                .avgUpgradeTime(45)
                .successRateAfterUpgrade(94)
                .topPerformersInsight("Les utilisateurs similaires génèrent en moyenne 3x plus de revenus après upgrade")
                .build();
    }

    /**
     * Calcule les bénéfices projetés
     */
    private AIRecommendationDTO.ProjectedBenefits calculateProjectedBenefits(
            UserProfileDTO profile, String recommendedTier) {

        double conversionRate = profile.getConversionRate() != null ? profile.getConversionRate() : 15;
        int baseROI = conversionRate >= 25 ? 340 : 180;
        int additionalProjects = "elite".equals(recommendedTier) ? 15 : 8;

        return AIRecommendationDTO.ProjectedBenefits.builder()
                .estimatedROI(baseROI)
                .additionalProjects(additionalProjects)
                .visibilityIncrease("elite".equals(recommendedTier) ? 320 : 180)
                .timeToValue("elite".equals(recommendedTier) ? "21 jours" : "14 jours")
                .build();
    }

    /**
     * Construit la réponse pour un utilisateur déjà sur le plan optimal
     */
    private AIRecommendationDTO buildOptimalPlanResponse(UserProfileDTO profile) {
        return AIRecommendationDTO.builder()
                .shouldUpgrade(false)
                .recommendedPlanId(profile.getCurrentPlanId())
                .recommendedPlanName(profile.getCurrentPlanName())
                .recommendedTier(profile.getCurrentTier())
                .confidenceScore(15)
                .urgencyLevel("low")
                .aiAnalysis(AIRecommendationDTO.AIAnalysis.builder()
                        .summary("Félicitations ! Vous êtes sur le plan optimal pour votre profil d'utilisation.")
                        .detailedInsight("Votre utilisation est parfaitement alignée avec les capacités de votre plan actuel. " +
                                "Continuez à exploiter toutes les fonctionnalités disponibles.")
                        .keyFactors(List.of())
                        .riskAssessment("Aucun risque identifié. Continuez votre excellente utilisation.")
                        .build())
                .peerComparison(null)
                .projectedBenefits(null)
                .primaryCTA("Explorer les fonctionnalités")
                .secondaryCTA(null)
                .generatedAt(LocalDateTime.now())
                .modelVersion(completionModel)
                .tokensUsed(0)
                .build();
    }

    /**
     * Construit une recommandation de fallback en cas d'erreur
     */
    private AIRecommendationDTO buildFallbackRecommendation() {
        return AIRecommendationDTO.builder()
                .shouldUpgrade(false)
                .recommendedPlanId(0L)
                .recommendedPlanName("Actuel")
                .recommendedTier("starter")
                .confidenceScore(0)
                .urgencyLevel("low")
                .aiAnalysis(AIRecommendationDTO.AIAnalysis.builder()
                        .summary("Impossible de générer une recommandation pour le moment.")
                        .detailedInsight("Veuillez réessayer ultérieurement.")
                        .keyFactors(List.of())
                        .riskAssessment("N/A")
                        .build())
                .primaryCTA("Réessayer")
                .generatedAt(LocalDateTime.now())
                .modelVersion("fallback")
                .tokensUsed(0)
                .build();
    }

    /**
     * Détermine le niveau d'urgence
     */
    private String determineUrgency(UserProfileDTO profile, int confidenceScore) {
        int churnScore = profile.getChurnScore() != null ? profile.getChurnScore() : 0;

        if (churnScore >= 80 && confidenceScore >= 70) return "critical";
        if (churnScore >= 60 || confidenceScore >= 80) return "high";
        if (confidenceScore >= 50) return "medium";
        return "low";
    }

    /**
     * Sauvegarde la recommandation dans l'historique
     */
    private void saveToHistory(Long userId, AIRecommendationDTO recommendation) {
        try {
            RecommendationHistory history = RecommendationHistory.builder()
                    .userId(userId)
                    .recommendedPlanId(recommendation.getRecommendedPlanId())
                    .recommendedPlanName(recommendation.getRecommendedPlanName())
                    .confidenceScore(recommendation.getConfidenceScore())
                    .urgencyLevel(recommendation.getUrgencyLevel())
                    .aiSummary(recommendation.getAiAnalysis() != null ?
                            recommendation.getAiAnalysis().getSummary() : null)
                    .aiDetailedInsight(recommendation.getAiAnalysis() != null ?
                            recommendation.getAiAnalysis().getDetailedInsight() : null)
                    .projectedRoi(recommendation.getProjectedBenefits() != null ?
                            recommendation.getProjectedBenefits().getEstimatedROI() : null)
                    .tokensUsed(recommendation.getTokensUsed())
                    .modelVersion(recommendation.getModelVersion())
                    .build();

            historyRepository.save(history);
        } catch (Exception e) {
            log.error("Failed to save recommendation to history", e);
        }
    }

    /**
     * Track une action utilisateur sur une recommandation
     */
    @Transactional
    public void trackUserAction(Long recommendationId, String action) {
        historyRepository.findById(recommendationId).ifPresent(history -> {
            history.setUserAction(RecommendationHistory.UserAction.valueOf(action.toUpperCase()));
            history.setActionAt(LocalDateTime.now());
            historyRepository.save(history);
        });
    }

    /**
     * Soumet un feedback sur une recommandation
     */
    @Transactional
    public void submitFeedback(Long recommendationId, Integer score, String comment) {
        historyRepository.findById(recommendationId).ifPresent(history -> {
            history.setFeedbackScore(score);
            history.setFeedbackComment(comment);
            historyRepository.save(history);
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════

    private String getRecommendedPlanName(String userType, String tier) {
        if ("FREELANCER".equals(userType)) {
            return switch (tier.toLowerCase()) {
                case "pro" -> "Freelance Pro";
                case "elite" -> "Freelance Elite";
                default -> "Freelance Starter";
            };
        } else {
            return switch (tier.toLowerCase()) {
                case "pro" -> "Business Pro";
                case "elite" -> "Enterprise";
                default -> "Business Starter";
            };
        }
    }

    private Long getRecommendedPlanId(String tier) {
        return switch (tier.toLowerCase()) {
            case "pro" -> 2L;
            case "elite" -> 3L;
            default -> 1L;
        };
    }

    private int estimateTokens(String text) {
        // Estimation approximative: ~4 caractères par token
        return text != null ? text.length() / 4 : 0;
    }
}