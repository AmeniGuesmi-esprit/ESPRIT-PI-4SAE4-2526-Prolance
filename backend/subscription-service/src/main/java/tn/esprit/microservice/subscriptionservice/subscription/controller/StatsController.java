package tn.esprit.microservice.subscriptionservice.subscription.controller;


import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionStatus;
import tn.esprit.microservice.subscriptionservice.subscription.repository.SubscriptionRepository;
import tn.esprit.microservice.subscriptionservice.subscription.repository.UserSubscriptionRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor

public class StatsController {
    private final SubscriptionRepository subscriptionRepo;
    private final UserSubscriptionRepository userSubRepo;

    @GetMapping("/platform")
    public ResponseEntity<Map<String, Object>> getPlatformStats() {
        Map<String, Object> stats = new HashMap<>();

        long activeSubscriptions = userSubRepo.findAll().stream()
                .filter(us -> us.getStatus() == SubscriptionStatus.ACTIVE).count();

        stats.put("totalUsers", userSubRepo.count());
        stats.put("totalFreelancers", 0);
        stats.put("totalClients", 0);
        stats.put("activeSubscriptions", activeSubscriptions);
        stats.put("mostPopularPlan", subscriptionRepo.findAll()
                .stream().findFirst().map(s -> s.getName()).orElse("N/A"));
        stats.put("planDistribution", new HashMap<>());
        stats.put("totalPlans", subscriptionRepo.count());
        stats.put("satisfactionRate", 95.0);
        stats.put("avgResponseTime", 1.2);
        stats.put("projectsCompleted", 0);
        stats.put("totalRevenue", userSubRepo.findAll().stream()
                .mapToDouble(us -> us.getAmountPaid() != null ?
                        us.getAmountPaid().doubleValue() : 0).sum());

        return ResponseEntity.ok(stats);
    }
}
