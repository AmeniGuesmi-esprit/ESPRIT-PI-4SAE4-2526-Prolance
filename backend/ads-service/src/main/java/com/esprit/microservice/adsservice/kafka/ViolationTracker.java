package com.esprit.microservice.adsservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class ViolationTracker {

    private final KafkaProducerService kafkaProducerService;
    private final Map<Long, List<LocalDateTime>> userViolations = new ConcurrentHashMap<>();

    public void trackViolation(Long userId, String userEmail) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime tenMinutesAgo = now.minusMinutes(10);

        userViolations.putIfAbsent(userId, new ArrayList<>());
        List<LocalDateTime> violations = userViolations.get(userId);

        synchronized (violations) {
            violations.removeIf(timestamp -> timestamp.isBefore(tenMinutesAgo));
            violations.add(now);

            int violationCount = violations.size();
            log.info("[VIOLATION TRACKER] User {} has {} violations in last 10 minutes", userId, violationCount);

            if (violationCount == 3) {
                log.error("USER FLAGGED: User {} has reached 3 violations, please verify his identity", userId);
                
                kafkaProducerService.sendUserFlaggedEvent(userId, userEmail, violationCount);
                
                kafkaProducerService.sendUserAlert(
                    userId,
                    userEmail,
                    "User triggered 3+ violations in 10 mins"
                );
            }
            
            if (violationCount >= 3) {
                violations.clear();
            }
        }
    }
}
