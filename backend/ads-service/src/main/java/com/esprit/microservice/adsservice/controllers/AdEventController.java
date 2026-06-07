package com.esprit.microservice.adsservice.controllers;

import com.esprit.microservice.adsservice.dto.AdEvent;
import com.esprit.microservice.adsservice.kafka.KafkaProducerService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/ads/events")
@RequiredArgsConstructor
@Slf4j
public class AdEventController {

    private final KafkaProducerService kafkaProducerService;

    @PostMapping
    public ResponseEntity<Void> trackEvent(@Valid @RequestBody AdEventRequest request) {
        log.info("[EVENT TRACKING] Received {} event for ad {} from user {}", 
                request.getType(), request.getAdId(), request.getUserId());

        AdEvent event = AdEvent.builder()
                .adId(request.getAdId())
                .type(AdEvent.EventType.valueOf(request.getType().toUpperCase()))
                .createdBy(AdEvent.CreatedBy.HUMAN)
                .userId(request.getUserId())
                .timestamp(LocalDateTime.now())
                .build();

        kafkaProducerService.sendAdEvent(event);
        return ResponseEntity.ok().build();
    }

    @Data
    public static class AdEventRequest {
        private Long adId;
        private String type;
        private Long userId;
    }
}
