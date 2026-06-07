package tn.esprit.microservice.promoservice.service;

import org.springframework.stereotype.Service;
import tn.esprit.microservice.promoservice.Entity.PromoCode;
import tn.esprit.microservice.promoservice.Repository.PromoCodeRepository;
import tn.esprit.microservice.promoservice.dto.PromoRecommendationDTO;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PromoAIService {

    private final PromoCodeRepository promoCodeRepository;

    public PromoAIService(PromoCodeRepository promoCodeRepository) {
        this.promoCodeRepository = promoCodeRepository;
    }

    /**
     * Génère des recommandations de codes promo basées sur le type d'utilisateur
     * et le plan qu'il souhaite acheter
     */
    public List<PromoRecommendationDTO> getSmartRecommendations(
            String userType,
            String planTier,
            Long userId) {

        List<PromoCode> allValidPromos = promoCodeRepository.findAll().stream()
                .filter(PromoCode::isValid)
                .collect(Collectors.toList());

        List<PromoRecommendationDTO> recommendations = new ArrayList<>();

        for (PromoCode promo : allValidPromos) {
            PromoRecommendationDTO rec = analyzePromoForUser(promo, userType, planTier, userId);
            if (rec != null && rec.getRelevanceScore() > 30) {
                recommendations.add(rec);
            }
        }

        // Trier par score de pertinence décroissant
        recommendations.sort((a, b) -> Double.compare(b.getRelevanceScore(), a.getRelevanceScore()));

        // Retourner les 3 meilleurs
        return recommendations.stream().limit(3).collect(Collectors.toList());
    }

    /**
     * Analyse un code promo et calcule sa pertinence pour l'utilisateur
     */
    private PromoRecommendationDTO analyzePromoForUser(
            PromoCode promo,
            String userType,
            String planTier,
            Long userId) {

        double score = 50.0; // Score de base
        StringBuilder aiReason = new StringBuilder();
        String targetAudience = detectTargetAudience(promo);
        boolean isPersonalized = false;

        // 1. Vérifier la correspondance du type d'utilisateur
        if (targetAudience.equals(userType) || targetAudience.equals("ALL")) {
            score += 20;
            if (targetAudience.equals(userType)) {
                aiReason.append("🎯 Spécialement conçu pour les ").append(
                        userType.equals("FREELANCER") ? "freelancers" : "clients"
                ).append(". ");
                isPersonalized = true;
            }
        } else {
            score -= 30;
        }

        // 2. Analyser le pourcentage de réduction
        int discount = promo.getDiscountPercent();
        if (discount >= 25) {
            score += 15;
            aiReason.append("💰 Réduction exceptionnelle de ").append(discount).append("%. ");
        } else if (discount >= 15) {
            score += 10;
            aiReason.append("✨ Belle économie de ").append(discount).append("%. ");
        }

        // 3. Vérifier l'urgence (expire bientôt)
        if (promo.getExpiresAt() != null) {
            long daysUntilExpiry = ChronoUnit.DAYS.between(LocalDateTime.now(), promo.getExpiresAt());
            if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
                score += 15;
                aiReason.append("⏰ Expire dans ").append(daysUntilExpiry).append(" jours ! ");
            } else if (daysUntilExpiry <= 30) {
                score += 5;
            }
        }

        // 4. Vérifier la popularité (utilisations restantes)
        int remaining = promo.getMaxUses() - promo.getCurrentUses();
        if (remaining <= 10 && remaining > 0) {
            score += 10;
            aiReason.append("🔥 Seulement ").append(remaining).append(" codes restants ! ");
        }

        // 5. Correspondance avec le plan
        if (planTier != null) {
            if (planTier.equalsIgnoreCase("PRO") && discount >= 20) {
                score += 10;
                aiReason.append("💎 Parfait pour votre upgrade Pro. ");
            } else if (planTier.equalsIgnoreCase("ELITE") && discount >= 25) {
                score += 15;
                aiReason.append("👑 Idéal pour le plan Elite. ");
            }
        }

        // 6. Bonus pour les nouveaux utilisateurs (simulé)
        if (userId != null && userId < 100) {
            String codeUpper = promo.getCode().toUpperCase();
            if (codeUpper.contains("WELCOME") || codeUpper.contains("NEW")) {
                score += 20;
                aiReason.append("🆕 Offre spéciale nouveaux membres ! ");
                isPersonalized = true;
            }
        }

        // Construire la recommandation
        PromoRecommendationDTO rec = new PromoRecommendationDTO();
        rec.setId(promo.getId());
        rec.setCode(promo.getCode());
        rec.setDiscountPercent(promo.getDiscountPercent());
        rec.setDescription(promo.getDescription());
        rec.setExpiresAt(promo.getExpiresAt());
        rec.setRemainingUses(promo.getMaxUses() - promo.getCurrentUses());
        rec.setAiReason(aiReason.toString().trim());
        rec.setRelevanceScore(Math.min(score, 100));
        rec.setTargetAudience(targetAudience);
        rec.setIsPersonalized(isPersonalized);

        return rec;
    }

    /**
     * Détecte le public cible basé sur le code ou la description
     */
    private String detectTargetAudience(PromoCode promo) {
        String code = promo.getCode().toUpperCase();
        String desc = promo.getDescription() != null ? promo.getDescription().toUpperCase() : "";

        if (code.contains("FREELANCER") || code.contains("FREELANCE") ||
                desc.contains("FREELANCER") || desc.contains("FREELANCE")) {
            return "FREELANCER";
        }
        if (code.contains("CLIENT") || code.contains("BUSINESS") ||
                code.contains("ENTERPRISE") || desc.contains("CLIENT")) {
            return "CLIENT";
        }
        return "ALL";
    }

    /**
     * Génère un nouveau code promo avec l'IA
     */
    public PromoCode generateAIPromoCode(String targetType, Integer discount, Integer maxUses, Integer validDays) {
        PromoCode promo = new PromoCode();

        // Générer un code unique
        String prefix = targetType.equals("FREELANCER") ? "FL" : "CL";
        String suffix = generateRandomSuffix();
        promo.setCode(prefix + discount + suffix);

        promo.setDiscountPercent(discount);
        promo.setMaxUses(maxUses);
        promo.setCurrentUses(0);
        promo.setIsActive(true);
        promo.setExpiresAt(LocalDateTime.now().plusDays(validDays));

        // Description générée par IA
        String description = generateAIDescription(targetType, discount);
        promo.setDescription(description);

        return promoCodeRepository.save(promo);
    }

    private String generateRandomSuffix() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < 4; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    private String generateAIDescription(String targetType, Integer discount) {
        String[] templates = {
                "Offre exclusive %s - %d%% de réduction",
                "Promo spéciale %s - Économisez %d%%",
                "Code %s privilégié - Réduction de %d%%"
        };
        String audience = targetType.equals("FREELANCER") ? "Freelancers" : "Clients";
        int idx = new Random().nextInt(templates.length);
        return String.format(templates[idx], audience, discount);
    }
}