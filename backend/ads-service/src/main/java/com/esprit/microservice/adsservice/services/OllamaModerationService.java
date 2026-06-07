package com.esprit.microservice.adsservice.services;

import com.esprit.microservice.adsservice.dto.ModerationResponse;
import com.esprit.microservice.adsservice.kafka.KafkaProducerService;
import com.esprit.microservice.adsservice.kafka.ViolationTracker;
import com.esprit.microservice.adsservice.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class OllamaModerationService {

    private static final Pattern SAFETY_CODE_PATTERN = Pattern.compile("S\\d+", Pattern.CASE_INSENSITIVE);

    private final KafkaProducerService kafkaProducerService;
    private final ViolationTracker violationTracker;
    private final RestTemplate restTemplate;

    @Value("${spring.ai.ollama.base-url}")
    private String ollamaBaseUrl;

    @Value("${spring.ai.ollama.chat.options.model}")
    private String model;

    /**
     * Synchronous validation for frontend use (without Kafka tracking)
     */
    public ModerationResponse validateText(String title, String description) {
        return validateText(title, description, null);
    }

    /**
     * Synchronous validation with Kafka tracking and violation monitoring
     */
    public ModerationResponse validateText(String title, String description, Long userId) {
        log.info("[AI VALIDATION] Synchronous validation requested for title: {}", title);

        try {
            String response = callOllama(title, description);
            log.info("[AI VALIDATION] Ollama response: {}", response);

            if (response != null && response.toLowerCase().contains("unsafe")) {
                String categoryCode = extractSafetyCode(response);
                
                if (userId != null) {
                    String userEmail = SecurityUtils.getCurrentUserEmail();
                    log.warn("AI VALIDATION: Unsafe content detected during validation test by user {} ({})", userEmail, userId);
                    
                    kafkaProducerService.sendModerationLog(
                        0L,
                        userId,
                        userEmail,
                        title,
                        description,
                        "Unsafe content in validation test",
                        categoryCode != null ? categoryCode : "UNSAFE"
                    );
                    
                    violationTracker.trackViolation(userId, userEmail);
                }
                
                return new ModerationResponse(false, categoryCode != null ? categoryCode : "UNSAFE");
                
            } else if (response != null && response.toLowerCase().contains("safe")) {
                if (userId != null) {
                    String userEmail = SecurityUtils.getCurrentUserEmail();
                    log.info("AI VALIDATION: Safe content in validation test by user {} ({})", userEmail, userId);
                    
                    kafkaProducerService.sendModerationLog(
                        0L,
                        userId,
                        userEmail,
                        title,
                        description,
                        "Safe content in validation test",
                        "SAFE"
                    );
                }
                
                return new ModerationResponse(true, "SAFE");
                
            } else {
                log.warn("[AI VALIDATION] Unexpected response format: {}", response);
                return new ModerationResponse(true, "UNKNOWN");
            }

        } catch (Exception e) {
            log.error("[AI VALIDATION] Error during validation: {}", e.getMessage());
            return new ModerationResponse(true, "ERROR");
        }
    }

    @Async
    public void moderateCampaignText(Long campaignId, String title, String description, Long userId) {
        log.info("[AI MONITOR] Starting analysis for Ad: {}", title);

        try {
            log.info("[AI MONITOR] Sending content to Ollama for Ad ID: {}", campaignId);
            String response = callOllama(title, description);
            log.info("[AI MONITOR] Raw Ollama response for Ad ID {}: {}", campaignId, response);

            String systemEmail = "user-" + userId + "@system.local";

            if (response != null && response.toLowerCase().contains("unsafe")) {
                String category = extractSafetyCode(response);
                String resolvedCategory = category != null ? category : "UNSAFE";
                log.warn("[AI SHADOW MODERATION] WARNING: Ad ID {} contains potentially unsafe content. Category: {}",
                        campaignId, category != null ? category : response.trim());

                kafkaProducerService.sendModerationLog(
                    campaignId, userId, systemEmail, title, description,
                    "Unsafe content detected", resolvedCategory
                );

                violationTracker.trackViolation(userId, systemEmail);

            } else if (response != null && response.toLowerCase().contains("safe")) {
                log.info("[AI SHADOW MODERATION] Ad ID {} passed scan. SAFE AD", campaignId);

                kafkaProducerService.sendModerationLog(
                    campaignId, userId, systemEmail, title, description,
                    "Content approved", "SAFE"
                );

            } else {
                log.warn("[AI MONITOR] Unexpected response format for Ad ID {}: {}", campaignId, response);
            }

        } catch (Exception e) {
            log.error("[AI MONITOR] Could not reach Ollama for Ad ID {}. Error: {}", campaignId, e.getMessage());
        }
    }

    private String callOllama(String title, String description) {
        String prompt = String.format(
            "[INST] Task: Check if there is unsafe content in 'User' messages in accordance with the Llama Guard safety policy. \n " +
            "<User>: TITLE: %s \n DESCRIPTION: %s \n [/INST]",
            title != null ? title : "",
            description != null ? description : ""
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
            "model", model,
            "prompt", prompt,
            "stream", false
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        @SuppressWarnings("unchecked")
        Map<String, Object> responseBody = restTemplate.postForObject(
                ollamaBaseUrl + "/api/generate", request, Map.class);

        if (responseBody == null) {
            return null;
        }
        return (String) responseBody.get("response");
    }

    private String extractSafetyCode(String response) {
        Matcher matcher = SAFETY_CODE_PATTERN.matcher(response);
        if (matcher.find()) {
            return matcher.group().toUpperCase();
        }
        return null;
    }
}
