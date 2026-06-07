package tn.esprit.microservice.subscriptionservice;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tn.esprit.microservice.subscriptionservice.subscription.exception.ActiveSubscriptionNotFoundException;
import tn.esprit.microservice.subscriptionservice.subscription.exception.ErrorResponse;
import tn.esprit.microservice.subscriptionservice.subscription.exception.GlobalExceptionHandler;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleActiveSubscriptionNotFound_returns404WithErrorResponse() {
        ActiveSubscriptionNotFoundException ex = new ActiveSubscriptionNotFoundException(100L);

        ResponseEntity<ErrorResponse> response = handler.handleActiveSubscriptionNotFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("100"));
        assertNotNull(response.getBody().getTimestamp());
    }

    @Test
    void activeSubscriptionNotFoundException_containsUserIdInMessage() {
        ActiveSubscriptionNotFoundException ex = new ActiveSubscriptionNotFoundException(42L);

        assertTrue(ex.getMessage().contains("42"));
        assertTrue(ex.getMessage().contains("Aucun abonnement actif"));
    }

    @Test
    void errorResponse_gettersReturnCorrectValues() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        ErrorResponse error = new ErrorResponse(500, "Test error", now);

        assertEquals(500, error.getStatus());
        assertEquals("Test error", error.getMessage());
        assertEquals(now, error.getTimestamp());
    }
}
