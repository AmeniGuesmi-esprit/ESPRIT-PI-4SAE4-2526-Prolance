package com.esprit.microservice.adsservice.kafka;

import com.esprit.microservice.adsservice.dto.AdEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class KafkaProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String AD_EVENTS_TOPIC = "ad-events";
    private static final String MODERATION_LOGS_TOPIC = "moderation-logs";
    private static final String USER_ALERTS_TOPIC = "user-alerts";
    private static final String FLAGGED_USERS_TOPIC = "flagged_users";

    public void sendAdEvent(AdEvent event) {
        try {
            enrichWithGeoData(event);
            log.info("[KAFKA] Sending ad event to {}: {}", AD_EVENTS_TOPIC, event);
            kafkaTemplate.send(AD_EVENTS_TOPIC, event.getAdId().toString(), event);
        } catch (Exception e) {
            log.error("[KAFKA] Failed to send ad event: {}", e.getMessage(), e);
        }
    }

    public void sendModerationLog(Long adId, Long userId, String userEmail, String title, String description, String violation, String categoryCode) {
        try {
            TunisianGeoData.GeoLocation geo = TunisianGeoData.getRandomLocation();
            Map<String, Object> logData = new HashMap<>();
            logData.put("adId", adId);
            logData.put("userId", userId != null ? userId : 0L);
            logData.put("userEmail", userEmail != null ? userEmail : "unknown");
            logData.put("title", title != null ? title : "");
            logData.put("description", description != null ? description : "");
            logData.put("violation", violation);
            logData.put("categoryCode", categoryCode);
            logData.put("timestamp", LocalDateTime.now().toString());
            logData.put("ip", geo.ip());
            logData.put("latitude", geo.latitude());
            logData.put("longitude", geo.longitude());
            logData.put("city", geo.city());
            log.info("[KAFKA] Sending moderation log to {}: Ad {} - User {} - {}", 
                    MODERATION_LOGS_TOPIC, adId, userEmail, violation);
            kafkaTemplate.send(MODERATION_LOGS_TOPIC, adId.toString(), logData);
        } catch (Exception e) {
            log.error("[KAFKA] Failed to send moderation log: {}", e.getMessage(), e);
        }
    }

    public void sendUserAlert(Long userId, String userEmail, String message) {
        try {
            TunisianGeoData.GeoLocation alertGeo = TunisianGeoData.getRandomLocation();
            Map<String, Object> alert = new HashMap<>();
            alert.put("userId", userId);
            alert.put("userEmail", userEmail != null ? userEmail : "unknown");
            alert.put("message", message);
            alert.put("priority", "HIGH");
            alert.put("timestamp", LocalDateTime.now().toString());
            alert.put("ip", alertGeo.ip());
            alert.put("latitude", alertGeo.latitude());
            alert.put("longitude", alertGeo.longitude());
            alert.put("city", alertGeo.city());
            log.warn("[KAFKA] Sending HIGH PRIORITY alert to {}: User {} - {}", USER_ALERTS_TOPIC, userId, message);
            kafkaTemplate.send(USER_ALERTS_TOPIC, userId.toString(), alert);
        } catch (Exception e) {
            log.error("[KAFKA] Failed to send user alert: {}", e.getMessage(), e);
        }
    }

    public void sendUserFlaggedEvent(Long userId, String email, int violationCount) {
        try {
            TunisianGeoData.GeoLocation flagGeo = TunisianGeoData.getRandomLocation();
            Map<String, Object> event = new HashMap<>();
            event.put("userId", userId);
            event.put("email", email != null ? email : "unknown");
            event.put("violationCount", violationCount);
            event.put("timestamp", LocalDateTime.now().toString());
            event.put("status", "FLAGGED");
            event.put("ip", flagGeo.ip());
            event.put("latitude", flagGeo.latitude());
            event.put("longitude", flagGeo.longitude());
            event.put("city", flagGeo.city());
            log.warn("[KAFKA] Sending FLAGGED event to {}: User {} ({}) with {} violations", 
                    FLAGGED_USERS_TOPIC, email, userId, violationCount);
            kafkaTemplate.send(FLAGGED_USERS_TOPIC, userId.toString(), event);
        } catch (Exception e) {
            log.error("[KAFKA] Failed to send user flagged event: {}", e.getMessage(), e);
        }
    }

    private void enrichWithGeoData(AdEvent event) {
        TunisianGeoData.GeoLocation geo = TunisianGeoData.getRandomLocation();
        event.setIp(geo.ip());
        event.setLatitude(geo.latitude());
        event.setLongitude(geo.longitude());
        event.setCity(geo.city());
    }
}
