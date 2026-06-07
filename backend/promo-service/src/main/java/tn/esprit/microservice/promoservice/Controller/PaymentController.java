package tn.esprit.microservice.promoservice.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.microservice.promoservice.Entity.PromoCode;
import tn.esprit.microservice.promoservice.Repository.PromoCodeRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")

public class PaymentController {

    // ✅ Injection manuelle sans Lombok
    private final PromoCodeRepository promoCodeRepository;

    public PaymentController(PromoCodeRepository promoCodeRepository) {
        this.promoCodeRepository = promoCodeRepository;
    }

    @GetMapping("/promo/validate/{code}")
    public ResponseEntity<Map<String, Object>> validatePromo(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        PromoCode promo = promoCodeRepository.findByCodeIgnoreCase(code).orElse(null);

        if (promo == null || !promo.isValid()) {
            response.put("valid", false);
            response.put("message", "Code promo invalide ou expiré");
            return ResponseEntity.ok(response);
        }

        response.put("valid", true);
        response.put("discountPercent", promo.getDiscountPercent());
        response.put("description", promo.getDescription());
        response.put("message", "-" + promo.getDiscountPercent() + "% appliqué !");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/promo/apply/{code}")
    public ResponseEntity<Map<String, Object>> applyPromo(@PathVariable String code) {
        Map<String, Object> response = new HashMap<>();
        PromoCode promo = promoCodeRepository.findByCodeIgnoreCase(code).orElse(null);

        if (promo == null || !promo.isValid()) {
            response.put("success", false);
            response.put("message", "Code promo invalide");
            return ResponseEntity.ok(response);
        }

        promo.incrementUses();
        promoCodeRepository.save(promo);
        response.put("success", true);
        response.put("discountPercent", promo.getDiscountPercent());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/simulate")
    public ResponseEntity<Map<String, Object>> simulatePayment(
            @RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        try { Thread.sleep(1500); } catch (InterruptedException ignored) {}
        response.put("success", true);
        response.put("transactionId", "TXN-" + System.currentTimeMillis());
        response.put("message", "Paiement effectué avec succès");
        response.put("paymentMethod", "CARD_SIMULATED");
        return ResponseEntity.ok(response);
    }
}