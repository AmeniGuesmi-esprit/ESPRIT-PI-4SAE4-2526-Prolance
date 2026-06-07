package tn.esprit.microservice.subscriptionservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tn.esprit.microservice.subscriptionservice.subscription.controller.SubscriptionController;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.CreateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.UpdateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.service.SubscriptionService;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionControllerTest {

    @Mock
    private SubscriptionService subscriptionService;

    @InjectMocks
    private SubscriptionController controller;

    private SubscriptionResponse sample;

    @BeforeEach
    void setUp() {
        sample = new SubscriptionResponse();
        sample.setId(1L);
        sample.setName("PRO");
    }

    @Test
    void create_returnsCreatedStatus() {
        CreateSubscriptionRequest req = new CreateSubscriptionRequest();
        req.setName("PRO");
        when(subscriptionService.createSubscription(req)).thenReturn(sample);

        ResponseEntity<SubscriptionResponse> response = controller.create(req);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals("PRO", response.getBody().getName());
    }

    @Test
    void getAll_returnsList() {
        when(subscriptionService.getAllSubscriptions())
            .thenReturn(Arrays.asList(sample, sample));

        ResponseEntity<List<SubscriptionResponse>> response = controller.getAll();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().size());
    }

    @Test
    void getActive_returnsList() {
        when(subscriptionService.getActiveSubscriptions())
            .thenReturn(Arrays.asList(sample));

        ResponseEntity<List<SubscriptionResponse>> response = controller.getActive();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void getByType_returnsFilteredList() {
        when(subscriptionService.getSubscriptionsByType(SubscriptionType.FREELANCER))
            .thenReturn(Arrays.asList(sample));

        ResponseEntity<List<SubscriptionResponse>> response =
            controller.getByType(SubscriptionType.FREELANCER);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().size());
    }

    @Test
    void getById_returnsSubscription() {
        when(subscriptionService.getSubscriptionById(1L)).thenReturn(sample);

        ResponseEntity<SubscriptionResponse> response = controller.getById(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1L, response.getBody().getId());
    }

    @Test
    void update_returnsUpdatedSubscription() {
        UpdateSubscriptionRequest req = new UpdateSubscriptionRequest();
        req.setName("PRO+");
        when(subscriptionService.updateSubscription(1L, req)).thenReturn(sample);

        ResponseEntity<SubscriptionResponse> response = controller.update(1L, req);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void deactivate_returnsNoContent() {
        doNothing().when(subscriptionService).deactivateSubscription(1L);

        ResponseEntity<Void> response = controller.deactivate(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(subscriptionService).deactivateSubscription(1L);
    }

    @Test
    void activate_returnsNoContent() {
        doNothing().when(subscriptionService).activateSubscription(1L);

        ResponseEntity<Void> response = controller.activate(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(subscriptionService).activateSubscription(1L);
    }

    @Test
    void delete_returnsNoContent() {
        doNothing().when(subscriptionService).deleteSubscription(1L);

        ResponseEntity<Void> response = controller.delete(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(subscriptionService).deleteSubscription(1L);
    }
}
