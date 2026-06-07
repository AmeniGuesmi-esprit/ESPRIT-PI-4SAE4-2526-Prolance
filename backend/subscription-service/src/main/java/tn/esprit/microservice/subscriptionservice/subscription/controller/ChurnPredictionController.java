package tn.esprit.microservice.subscriptionservice.subscription.controller;

import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.UserSubscription;
import tn.esprit.microservice.subscriptionservice.subscription.repository.UserSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.temporal.ChronoUnit;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/churn-prediction")
@RequiredArgsConstructor

public class ChurnPredictionController {

    private final UserSubscriptionRepository repo;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAll() {
        List<Map<String, Object>> result = new ArrayList<>();
        repo.findAll().forEach(us -> result.add(buildPrediction(us)));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/high-risk")
    public ResponseEntity<List<Map<String, Object>>> getHighRisk() {
        List<Map<String, Object>> result = new ArrayList<>();
        repo.findAll().forEach(us -> {
            Map<String, Object> p = buildPrediction(us);
            if ((int) p.get("churnScore") >= 60) result.add(p);
        });
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getOne(@PathVariable Long id) {
        return repo.findById(id)
                .map(us -> ResponseEntity.ok(buildPrediction(us)))
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> buildPrediction(UserSubscription us) {
        long daysRemaining = ChronoUnit.DAYS.between(LocalDateTime.now(), us.getEndDate());
        int score = calculateChurnScore(us, daysRemaining);

        String riskLevel = score >= 75 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";

        Map<String, Object> p = new HashMap<>();
        p.put("userSubscriptionId", us.getId());
        p.put("userId", us.getUserId());
        p.put("userName", "User #" + us.getUserId());
        p.put("planName", us.getSubscription().getName());
        p.put("planType", us.getSubscription().getType().toString());
        p.put("billingCycle", us.getSubscription().getBillingCycle().toString());
        p.put("amountPaid", us.getAmountPaid());
        p.put("status", us.getStatus().toString());
        p.put("startDate", us.getStartDate().toString());
        p.put("endDate", us.getEndDate().toString());
        p.put("autoRenew", us.getAutoRenew());
        p.put("daysRemaining", daysRemaining);
        p.put("currentProjects", us.getCurrentProjects());
        p.put("maxProjects", us.getSubscription().getMaxProjects());
        p.put("currentProposals", us.getCurrentProposals());
        p.put("maxProposals", us.getSubscription().getMaxProposals());
        p.put("churnScore", score);
        p.put("riskLevel", riskLevel);
        p.put("factors", new ArrayList<>());
        p.put("aiSummary", "Score de risque basé sur l'activité et l'expiration");
        p.put("suggestedAction", score >= 60 ? "Contacter l'utilisateur" : "Surveiller l'activité");
        return p;
    }

    private int calculateChurnScore(UserSubscription us, long daysRemaining) {
        int score = 0;
        if (daysRemaining < 7) score += 40;
        else if (daysRemaining < 30) score += 20;
        if (!us.getAutoRenew()) score += 30;
        if (us.getCurrentProjects() == 0) score += 20;
        return Math.min(score, 100);
    }
}