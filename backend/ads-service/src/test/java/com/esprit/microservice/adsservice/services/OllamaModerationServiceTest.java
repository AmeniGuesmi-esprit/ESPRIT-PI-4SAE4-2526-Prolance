package com.esprit.microservice.adsservice.services;

import com.esprit.microservice.adsservice.dto.ModerationResponse;
import com.esprit.microservice.adsservice.kafka.KafkaProducerService;
import com.esprit.microservice.adsservice.kafka.ViolationTracker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OllamaModerationServiceTest {

    @Mock
    private KafkaProducerService kafkaProducerService;

    @Mock
    private ViolationTracker violationTracker;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private OllamaModerationService moderationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(moderationService, "ollamaBaseUrl", "http://localhost:11434");
        ReflectionTestUtils.setField(moderationService, "model", "llama-guard3:1b");
    }

    // ── validateText tests (without userId) ──

    @Test
    void validateText_safeContent_returnsIsSafeTrue() {
        Map<String, Object> ollamaResponse = Map.of("response", "safe");
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(ollamaResponse);

        ModerationResponse result = moderationService.validateText("Good Title", "Good Description");

        assertThat(result.isSafe()).isTrue();
        assertThat(result.getCategoryCode()).isEqualTo("SAFE");
    }

    @Test
    void validateText_unsafeContent_returnsIsSafeFalse() {
        Map<String, Object> ollamaResponse = Map.of("response", "unsafe\nS1");
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(ollamaResponse);

        ModerationResponse result = moderationService.validateText("Bad Title", "Bad Description");

        assertThat(result.isSafe()).isFalse();
        assertThat(result.getCategoryCode()).isEqualTo("S1");
    }

    @Test
    void validateText_unsafeContentWithoutCategory_returnsUNSAFE() {
        Map<String, Object> ollamaResponse = Map.of("response", "unsafe content detected");
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(ollamaResponse);

        ModerationResponse result = moderationService.validateText("Title", "Desc");

        assertThat(result.isSafe()).isFalse();
        assertThat(result.getCategoryCode()).isEqualTo("UNSAFE");
    }

    @Test
    void validateText_unexpectedResponse_returnsUnknown() {
        Map<String, Object> ollamaResponse = Map.of("response", "something unexpected");
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(ollamaResponse);

        ModerationResponse result = moderationService.validateText("Title", "Desc");

        assertThat(result.isSafe()).isTrue();
        assertThat(result.getCategoryCode()).isEqualTo("UNKNOWN");
    }

    @Test
    void validateText_ollamaError_returnsError() {
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class)))
                .thenThrow(new RestClientException("Connection refused"));

        ModerationResponse result = moderationService.validateText("Title", "Desc");

        assertThat(result.isSafe()).isTrue();
        assertThat(result.getCategoryCode()).isEqualTo("ERROR");
    }

    @Test
    void validateText_nullResponse_returnsUnknown() {
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(null);

        ModerationResponse result = moderationService.validateText("Title", "Desc");

        assertThat(result.isSafe()).isTrue();
        assertThat(result.getCategoryCode()).isEqualTo("UNKNOWN");
    }

    // ── validateText tests (with userId — no SecurityContext so userEmail will be null) ──

    @Test
    void validateText_withUserId_unsafeContent_tracksViolation() {
        Map<String, Object> ollamaResponse = Map.of("response", "unsafe\nS3");
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(ollamaResponse);

        ModerationResponse result = moderationService.validateText("Bad Title", "Bad Desc", 42L);

        assertThat(result.isSafe()).isFalse();
        assertThat(result.getCategoryCode()).isEqualTo("S3");
        verify(kafkaProducerService).sendModerationLog(eq(0L), eq(42L), any(), eq("Bad Title"), eq("Bad Desc"), eq("Unsafe content in validation test"), eq("S3"));
        verify(violationTracker).trackViolation(eq(42L), any());
    }

    @Test
    void validateText_withUserId_safeContent_logsSafeModeration() {
        Map<String, Object> ollamaResponse = Map.of("response", "safe");
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(ollamaResponse);

        ModerationResponse result = moderationService.validateText("Good Title", "Good Desc", 42L);

        assertThat(result.isSafe()).isTrue();
        verify(kafkaProducerService).sendModerationLog(eq(0L), eq(42L), any(), eq("Good Title"), eq("Good Desc"), eq("Safe content in validation test"), eq("SAFE"));
        verify(violationTracker, never()).trackViolation(any(), any());
    }

    @Test
    void validateText_withNullUserId_unsafeContent_doesNotTrackViolation() {
        Map<String, Object> ollamaResponse = Map.of("response", "unsafe\nS2");
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(ollamaResponse);

        ModerationResponse result = moderationService.validateText("Bad", "Content", null);

        assertThat(result.isSafe()).isFalse();
        verify(kafkaProducerService, never()).sendModerationLog(any(), any(), any(), any(), any(), any(), any());
        verify(violationTracker, never()).trackViolation(any(), any());
    }

    // ── moderateCampaignText tests ──

    @Test
    void moderateCampaignText_unsafeContent_sendsLogAndTracksViolation() {
        Map<String, Object> ollamaResponse = Map.of("response", "unsafe\nS5");
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(ollamaResponse);

        moderationService.moderateCampaignText(10L, "Bad Ad", "Bad Desc", 42L);

        verify(kafkaProducerService).sendModerationLog(eq(10L), eq(42L), eq("user-42@system.local"),
                eq("Bad Ad"), eq("Bad Desc"), eq("Unsafe content detected"), eq("S5"));
        verify(violationTracker).trackViolation(eq(42L), eq("user-42@system.local"));
    }

    @Test
    void moderateCampaignText_safeContent_sendsLogOnly() {
        Map<String, Object> ollamaResponse = Map.of("response", "safe");
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class))).thenReturn(ollamaResponse);

        moderationService.moderateCampaignText(10L, "Good Ad", "Good Desc", 42L);

        verify(kafkaProducerService).sendModerationLog(eq(10L), eq(42L), eq("user-42@system.local"),
                eq("Good Ad"), eq("Good Desc"), eq("Content approved"), eq("SAFE"));
        verify(violationTracker, never()).trackViolation(any(), any());
    }

    @Test
    void moderateCampaignText_ollamaError_doesNotThrow() {
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class)))
                .thenThrow(new RestClientException("timeout"));

        moderationService.moderateCampaignText(10L, "Title", "Desc", 42L);

        verify(kafkaProducerService, never()).sendModerationLog(any(), any(), any(), any(), any(), any(), any());
    }
}
