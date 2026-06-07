package tn.esprit.microservice.promoservice.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.microservice.promoservice.Entity.PromoCode;
import tn.esprit.microservice.promoservice.Repository.PromoCodeRepository;
import tn.esprit.microservice.promoservice.dto.PromoRecommendationDTO;
import tn.esprit.microservice.promoservice.service.PromoAIService;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/promos")

public class PromoController {

    private final PromoCodeRepository promoCodeRepository;
    private final PromoAIService promoAIService;

    public PromoController(PromoCodeRepository promoCodeRepository, PromoAIService promoAIService) {
        this.promoCodeRepository = promoCodeRepository;
        this.promoAIService = promoAIService;
    }

    // ══════════════════════════════════════════════════════════════
    //  ENDPOINTS IA (FRONTOFFICE)
    // ══════════════════════════════════════════════════════════════

    /**
     * 🤖 Obtenir les recommandations IA de codes promo
     */
    @GetMapping("/ai/recommend")
    public ResponseEntity<Map<String, Object>> getAIRecommendations(
            @RequestParam(defaultValue = "FREELANCER") String userType,
            @RequestParam(required = false) String planTier,
            @RequestParam(required = false) Long userId) {

        Map<String, Object> response = new HashMap<>();

        List<PromoRecommendationDTO> recommendations =
                promoAIService.getSmartRecommendations(userType, planTier, userId);

        response.put("success", true);
        response.put("recommendations", recommendations);
        response.put("totalFound", recommendations.size());
        response.put("generatedAt", LocalDateTime.now().toString());
        response.put("aiModel", "PromoRecommender-v1.0");

        return ResponseEntity.ok(response);
    }

    // ══════════════════════════════════════════════════════════════
    //  CRUD ADMIN (BACKOFFICE)
    // ══════════════════════════════════════════════════════════════

    /**
     * 📋 Liste tous les codes promo (Admin)
     */
    @GetMapping
    public ResponseEntity<List<PromoCode>> getAllPromos() {
        return ResponseEntity.ok(promoCodeRepository.findAll());
    }

    /**
     * 🔍 Obtenir un code promo par ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<PromoCode> getPromoById(@PathVariable Long id) {
        return promoCodeRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * ➕ Créer un nouveau code promo
     */
    @PostMapping
    public ResponseEntity<PromoCode> createPromo(@RequestBody PromoCode promo) {
        promo.setCurrentUses(0);
        if (promo.getIsActive() == null) promo.setIsActive(true);
        return ResponseEntity.ok(promoCodeRepository.save(promo));
    }

    /**
     * 🤖 Générer un code promo avec IA
     */
    @PostMapping("/ai/generate")
    public ResponseEntity<Map<String, Object>> generateAIPromo(
            @RequestParam(defaultValue = "FREELANCER") String targetType,
            @RequestParam(defaultValue = "15") Integer discount,
            @RequestParam(defaultValue = "100") Integer maxUses,
            @RequestParam(defaultValue = "30") Integer validDays) {

        Map<String, Object> response = new HashMap<>();
        PromoCode generated = promoAIService.generateAIPromoCode(targetType, discount, maxUses, validDays);

        response.put("success", true);
        response.put("promo", generated);
        response.put("message", "Code promo généré par IA avec succès !");

        return ResponseEntity.ok(response);
    }

    /**
     * ✏️ Mettre à jour un code promo
     */
    @PutMapping("/{id}")
    public ResponseEntity<PromoCode> updatePromo(@PathVariable Long id, @RequestBody PromoCode promo) {
        return promoCodeRepository.findById(id)
                .map(existing -> {
                    existing.setCode(promo.getCode());
                    existing.setDiscountPercent(promo.getDiscountPercent());
                    existing.setDescription(promo.getDescription());
                    existing.setExpiresAt(promo.getExpiresAt());
                    existing.setMaxUses(promo.getMaxUses());
                    existing.setIsActive(promo.getIsActive());
                    return ResponseEntity.ok(promoCodeRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 🗑️ Supprimer un code promo
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePromo(@PathVariable Long id) {
        if (promoCodeRepository.existsById(id)) {
            promoCodeRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * 🔄 Activer/Désactiver un code promo
     */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<PromoCode> togglePromo(@PathVariable Long id) {
        return promoCodeRepository.findById(id)
                .map(promo -> {
                    promo.setIsActive(!promo.getIsActive());
                    return ResponseEntity.ok(promoCodeRepository.save(promo));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 📊 Statistiques des codes promo
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();

        List<PromoCode> all = promoCodeRepository.findAll();
        long activeCount = all.stream().filter(p -> p.getIsActive() && p.isValid()).count();
        int totalUsages = all.stream().mapToInt(PromoCode::getCurrentUses).sum();
        double avgDiscount = all.stream().mapToInt(PromoCode::getDiscountPercent).average().orElse(0);

        stats.put("totalPromos", all.size());
        stats.put("activePromos", activeCount);
        stats.put("totalUsages", totalUsages);
        stats.put("averageDiscount", Math.round(avgDiscount * 100) / 100.0);

        return ResponseEntity.ok(stats);
    }
}