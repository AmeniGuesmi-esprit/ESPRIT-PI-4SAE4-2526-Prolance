package tn.esprit.microservice.subscriptionservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tn.esprit.microservice.subscriptionservice.subscription.controller.UserSubscriptionController;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.SubscribeRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.UserSubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.service.UserSubscriptionService;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserSubscriptionControllerTest {

    @Mock
    private UserSubscriptionService userSubscriptionService;

    @InjectMocks
    private UserSubscriptionController controller;

    private UserSubscriptionResponse sample;

    @BeforeEach
    void setUp() {
        sample = new UserSubscriptionResponse();
        sample.setId(1L);
        sample.setUserId(100L);
    }

    @Test
    void subscribe_returnsCreatedStatus() {
        SubscribeRequest req = new SubscribeRequest();
        req.setUserId(100L);
        req.setSubscriptionId(10L);
        when(userSubscriptionService.subscribe(req)).thenReturn(sample);

        ResponseEntity<UserSubscriptionResponse> response = controller.subscribe(req);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(100L, response.getBody().getUserId());
    }

    @Test
    void getActive_returnsSubscription() {
        when(userSubscriptionService.getActiveSubscription(100L)).thenReturn(sample);

        ResponseEntity<UserSubscriptionResponse> response = controller.getActive(100L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void getHistory_returnsList() {
        when(userSubscriptionService.getUserSubscriptionHistory(100L))
            .thenReturn(Arrays.asList(sample, sample));

        ResponseEntity<List<UserSubscriptionResponse>> response = controller.getHistory(100L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().size());
    }

    @Test
    void getById_returnsSubscription() {
        when(userSubscriptionService.getUserSubscriptionById(1L)).thenReturn(sample);

        ResponseEntity<UserSubscriptionResponse> response = controller.getById(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1L, response.getBody().getId());
    }

    @Test
    void cancel_returnsNoContent() {
        doNothing().when(userSubscriptionService).cancelSubscription(100L);

        ResponseEntity<Void> response = controller.cancel(100L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(userSubscriptionService).cancelSubscription(100L);
    }

    @Test
    void renew_returnsSubscription() {
        when(userSubscriptionService.renewSubscription(100L)).thenReturn(sample);

        ResponseEntity<UserSubscriptionResponse> response = controller.renew(100L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void toggleAutoRenew_returnsNoContent() {
        doNothing().when(userSubscriptionService).toggleAutoRenew(100L, false);

        ResponseEntity<Void> response = controller.toggleAutoRenew(100L, false);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(userSubscriptionService).toggleAutoRenew(100L, false);
    }

    @Test
    void incrementProjects_returnsNoContent() {
        doNothing().when(userSubscriptionService).incrementProjectCount(100L);

        ResponseEntity<Void> response = controller.incrementProjects(100L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(userSubscriptionService).incrementProjectCount(100L);
    }

    @Test
    void incrementProposals_returnsNoContent() {
        doNothing().when(userSubscriptionService).incrementProposalCount(100L);

        ResponseEntity<Void> response = controller.incrementProposals(100L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(userSubscriptionService).incrementProposalCount(100L);
    }
}
