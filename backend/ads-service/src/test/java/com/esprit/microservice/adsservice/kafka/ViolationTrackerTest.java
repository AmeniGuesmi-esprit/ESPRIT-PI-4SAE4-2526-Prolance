package com.esprit.microservice.adsservice.kafka;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ViolationTrackerTest {

    @Mock
    private KafkaProducerService kafkaProducerService;

    @InjectMocks
    private ViolationTracker violationTracker;

    @Test
    void trackViolation_firstViolation_doesNotFlag() {
        violationTracker.trackViolation(1L, "user@test.com");

        verify(kafkaProducerService, never()).sendUserFlaggedEvent(eq(1L), anyString(), anyInt());
        verify(kafkaProducerService, never()).sendUserAlert(eq(1L), anyString(), anyString());
    }

    @Test
    void trackViolation_secondViolation_doesNotFlag() {
        violationTracker.trackViolation(1L, "user@test.com");
        violationTracker.trackViolation(1L, "user@test.com");

        verify(kafkaProducerService, never()).sendUserFlaggedEvent(eq(1L), anyString(), anyInt());
        verify(kafkaProducerService, never()).sendUserAlert(eq(1L), anyString(), anyString());
    }

    @Test
    void trackViolation_thirdViolation_flagsUser() {
        violationTracker.trackViolation(1L, "user@test.com");
        violationTracker.trackViolation(1L, "user@test.com");
        violationTracker.trackViolation(1L, "user@test.com");

        verify(kafkaProducerService).sendUserFlaggedEvent(eq(1L), eq("user@test.com"), eq(3));
        verify(kafkaProducerService).sendUserAlert(eq(1L), eq("user@test.com"), anyString());
    }

    @Test
    void trackViolation_thirdViolation_clearsAndResetsCounter() {
        violationTracker.trackViolation(1L, "user@test.com");
        violationTracker.trackViolation(1L, "user@test.com");
        violationTracker.trackViolation(1L, "user@test.com");

        // After flagging and clearing, a 4th violation should NOT trigger another flag
        violationTracker.trackViolation(1L, "user@test.com");

        // sendUserFlaggedEvent should have been called exactly once (at the 3rd violation)
        verify(kafkaProducerService).sendUserFlaggedEvent(eq(1L), eq("user@test.com"), eq(3));
    }

    @Test
    void trackViolation_differentUsers_trackedSeparately() {
        violationTracker.trackViolation(1L, "user1@test.com");
        violationTracker.trackViolation(1L, "user1@test.com");
        violationTracker.trackViolation(2L, "user2@test.com");

        verify(kafkaProducerService, never()).sendUserFlaggedEvent(eq(1L), anyString(), anyInt());
        verify(kafkaProducerService, never()).sendUserFlaggedEvent(eq(2L), anyString(), anyInt());
    }
}
