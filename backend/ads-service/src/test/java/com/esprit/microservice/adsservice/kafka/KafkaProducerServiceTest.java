package com.esprit.microservice.adsservice.kafka;

import com.esprit.microservice.adsservice.dto.AdEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.time.LocalDateTime;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KafkaProducerServiceTest {

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks
    private KafkaProducerService kafkaProducerService;

    @Test
    void sendAdEvent_success() {
        AdEvent event = AdEvent.builder()
                .adId(1L)
                .type(AdEvent.EventType.CLICK)
                .createdBy(AdEvent.CreatedBy.HUMAN)
                .userId(42L)
                .timestamp(LocalDateTime.now())
                .build();

        kafkaProducerService.sendAdEvent(event);

        verify(kafkaTemplate).send(eq("ad-events"), eq("1"), eq(event));
    }

    @Test
    void sendAdEvent_kafkaError_doesNotThrow() {
        AdEvent event = AdEvent.builder()
                .adId(1L)
                .type(AdEvent.EventType.VIEW)
                .createdBy(AdEvent.CreatedBy.HUMAN)
                .userId(42L)
                .timestamp(LocalDateTime.now())
                .build();

        when(kafkaTemplate.send(anyString(), anyString(), any()))
                .thenThrow(new RuntimeException("Kafka down"));

        kafkaProducerService.sendAdEvent(event);

        verify(kafkaTemplate).send(eq("ad-events"), eq("1"), eq(event));
    }

    @Test
    void sendModerationLog_success() {
        kafkaProducerService.sendModerationLog(1L, 42L, "user@test.com",
                "Title", "Desc", "Safe content", "SAFE");

        verify(kafkaTemplate).send(eq("moderation-logs"), eq("1"), any(Map.class));
    }

    @Test
    void sendModerationLog_withNulls_handlesGracefully() {
        kafkaProducerService.sendModerationLog(1L, null, null, null, null, "violation", "UNSAFE");

        verify(kafkaTemplate).send(eq("moderation-logs"), eq("1"), any(Map.class));
    }

    @Test
    void sendUserAlert_success() {
        kafkaProducerService.sendUserAlert(42L, "user@test.com", "Alert message");

        verify(kafkaTemplate).send(eq("user-alerts"), eq("42"), any(Map.class));
    }

    @Test
    void sendUserAlert_nullEmail_handlesGracefully() {
        kafkaProducerService.sendUserAlert(42L, null, "Alert message");

        verify(kafkaTemplate).send(eq("user-alerts"), eq("42"), any(Map.class));
    }

    @Test
    void sendUserFlaggedEvent_success() {
        kafkaProducerService.sendUserFlaggedEvent(42L, "user@test.com", 3);

        verify(kafkaTemplate).send(eq("flagged_users"), eq("42"), any(Map.class));
    }

    @Test
    void sendUserFlaggedEvent_kafkaError_doesNotThrow() {
        when(kafkaTemplate.send(anyString(), anyString(), any()))
                .thenThrow(new RuntimeException("Kafka down"));

        kafkaProducerService.sendUserFlaggedEvent(42L, "user@test.com", 3);

        verify(kafkaTemplate).send(eq("flagged_users"), eq("42"), any(Map.class));
    }
}
