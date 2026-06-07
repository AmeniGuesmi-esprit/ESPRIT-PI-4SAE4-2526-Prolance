package com.esprit.microservice.adsservice.controllers;

import com.esprit.microservice.adsservice.dto.AdEvent;
import com.esprit.microservice.adsservice.kafka.KafkaProducerService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdEventControllerTest {

    @Mock
    private KafkaProducerService kafkaProducerService;

    @InjectMocks
    private AdEventController controller;

    @Test
    void trackEvent_click_sendsKafkaEvent() {
        AdEventController.AdEventRequest request = new AdEventController.AdEventRequest();
        request.setAdId(10L);
        request.setType("CLICK");
        request.setUserId(42L);

        ResponseEntity<Void> response = controller.trackEvent(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        ArgumentCaptor<AdEvent> captor = ArgumentCaptor.forClass(AdEvent.class);
        verify(kafkaProducerService).sendAdEvent(captor.capture());

        AdEvent captured = captor.getValue();
        assertThat(captured.getAdId()).isEqualTo(10L);
        assertThat(captured.getType()).isEqualTo(AdEvent.EventType.CLICK);
        assertThat(captured.getCreatedBy()).isEqualTo(AdEvent.CreatedBy.HUMAN);
        assertThat(captured.getUserId()).isEqualTo(42L);
        assertThat(captured.getTimestamp()).isNotNull();
    }

    @Test
    void trackEvent_view_sendsKafkaEvent() {
        AdEventController.AdEventRequest request = new AdEventController.AdEventRequest();
        request.setAdId(5L);
        request.setType("view");
        request.setUserId(99L);

        ResponseEntity<Void> response = controller.trackEvent(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        ArgumentCaptor<AdEvent> captor = ArgumentCaptor.forClass(AdEvent.class);
        verify(kafkaProducerService).sendAdEvent(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(AdEvent.EventType.VIEW);
    }

    @Test
    void trackEvent_hover_sendsKafkaEvent() {
        AdEventController.AdEventRequest request = new AdEventController.AdEventRequest();
        request.setAdId(3L);
        request.setType("HOVER");
        request.setUserId(7L);

        ResponseEntity<Void> response = controller.trackEvent(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        ArgumentCaptor<AdEvent> captor = ArgumentCaptor.forClass(AdEvent.class);
        verify(kafkaProducerService).sendAdEvent(captor.capture());
        assertThat(captor.getValue().getType()).isEqualTo(AdEvent.EventType.HOVER);
    }
}
