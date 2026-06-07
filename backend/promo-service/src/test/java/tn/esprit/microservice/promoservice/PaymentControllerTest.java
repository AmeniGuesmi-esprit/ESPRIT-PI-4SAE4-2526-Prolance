package tn.esprit.microservice.promoservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tn.esprit.microservice.promoservice.Controller.PaymentController;
import tn.esprit.microservice.promoservice.Entity.PromoCode;
import tn.esprit.microservice.promoservice.Repository.PromoCodeRepository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private PromoCodeRepository promoCodeRepository;

    @InjectMocks
    private PaymentController paymentController;

    private PromoCode validPromo;

    @BeforeEach
    void setUp() {
        validPromo = new PromoCode();
        validPromo.setId(1L);
        validPromo.setCode("SUMMER25");
        validPromo.setDiscountPercent(25);
        validPromo.setMaxUses(100);
        validPromo.setCurrentUses(10);
        validPromo.setIsActive(true);
        validPromo.setExpiresAt(LocalDateTime.now().plusDays(30));
        validPromo.setDescription("Offre été 25%");
    }

    // ========== validatePromo ==========

    @Test
    void validatePromo_whenValidCode_returnsValidTrueWithDiscount() {
        when(promoCodeRepository.findByCodeIgnoreCase("SUMMER25"))
                .thenReturn(Optional.of(validPromo));

        ResponseEntity<Map<String, Object>> response =
                paymentController.validatePromo("SUMMER25");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue((Boolean) response.getBody().get("valid"));
        assertEquals(25, response.getBody().get("discountPercent"));
        assertTrue(response.getBody().get("message").toString().contains("25%"));
        assertEquals("Offre été 25%", response.getBody().get("description"));
    }

    @Test
    void validatePromo_whenCodeNotFound_returnsValidFalse() {
        when(promoCodeRepository.findByCodeIgnoreCase("INVALID"))
                .thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> response =
                paymentController.validatePromo("INVALID");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertFalse((Boolean) response.getBody().get("valid"));
        assertTrue(response.getBody().get("message").toString().contains("invalide"));
    }

    @Test
    void validatePromo_whenCodeExpired_returnsValidFalse() {
        validPromo.setExpiresAt(LocalDateTime.now().minusDays(1));
        when(promoCodeRepository.findByCodeIgnoreCase("SUMMER25"))
                .thenReturn(Optional.of(validPromo));

        ResponseEntity<Map<String, Object>> response =
                paymentController.validatePromo("SUMMER25");

        assertFalse((Boolean) response.getBody().get("valid"));
    }

    @Test
    void validatePromo_whenCodeInactive_returnsValidFalse() {
        validPromo.setIsActive(false);
        when(promoCodeRepository.findByCodeIgnoreCase("SUMMER25"))
                .thenReturn(Optional.of(validPromo));

        ResponseEntity<Map<String, Object>> response =
                paymentController.validatePromo("SUMMER25");

        assertFalse((Boolean) response.getBody().get("valid"));
    }

    @Test
    void validatePromo_whenMaxUsesReached_returnsValidFalse() {
        validPromo.setCurrentUses(100);
        validPromo.setMaxUses(100);
        when(promoCodeRepository.findByCodeIgnoreCase("SUMMER25"))
                .thenReturn(Optional.of(validPromo));

        ResponseEntity<Map<String, Object>> response =
                paymentController.validatePromo("SUMMER25");

        assertFalse((Boolean) response.getBody().get("valid"));
    }

    // ========== applyPromo ==========

    @Test
    void applyPromo_whenValidCode_incrementsUsesAndReturnsSuccess() {
        when(promoCodeRepository.findByCodeIgnoreCase("SUMMER25"))
                .thenReturn(Optional.of(validPromo));
        when(promoCodeRepository.save(any(PromoCode.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        int usesBefore = validPromo.getCurrentUses();

        ResponseEntity<Map<String, Object>> response =
                paymentController.applyPromo("SUMMER25");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue((Boolean) response.getBody().get("success"));
        assertEquals(25, response.getBody().get("discountPercent"));
        assertEquals(usesBefore + 1, validPromo.getCurrentUses());
        verify(promoCodeRepository).save(validPromo);
    }

    @Test
    void applyPromo_whenCodeNotFound_returnsSuccessFalse() {
        when(promoCodeRepository.findByCodeIgnoreCase("GHOST"))
                .thenReturn(Optional.empty());

        ResponseEntity<Map<String, Object>> response =
                paymentController.applyPromo("GHOST");

        assertFalse((Boolean) response.getBody().get("success"));
        assertTrue(response.getBody().get("message").toString().contains("invalide"));
        verify(promoCodeRepository, never()).save(any());
    }

    @Test
    void applyPromo_whenCodeExpired_returnsSuccessFalse() {
        validPromo.setExpiresAt(LocalDateTime.now().minusDays(5));
        when(promoCodeRepository.findByCodeIgnoreCase("SUMMER25"))
                .thenReturn(Optional.of(validPromo));

        ResponseEntity<Map<String, Object>> response =
                paymentController.applyPromo("SUMMER25");

        assertFalse((Boolean) response.getBody().get("success"));
        verify(promoCodeRepository, never()).save(any());
    }

    @Test
    void applyPromo_whenMaxUsesReached_returnsSuccessFalse() {
        validPromo.setCurrentUses(100);
        validPromo.setMaxUses(100);
        when(promoCodeRepository.findByCodeIgnoreCase("SUMMER25"))
                .thenReturn(Optional.of(validPromo));

        ResponseEntity<Map<String, Object>> response =
                paymentController.applyPromo("SUMMER25");

        assertFalse((Boolean) response.getBody().get("success"));
        verify(promoCodeRepository, never()).save(any());
    }

    // ========== simulatePayment ==========

    @Test
    void simulatePayment_returnsSuccessWithTransactionId() {
        Map<String, Object> request = new HashMap<>();
        request.put("amount", 29.99);
        request.put("method", "CARD");

        ResponseEntity<Map<String, Object>> response =
                paymentController.simulatePayment(request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue((Boolean) response.getBody().get("success"));
        assertNotNull(response.getBody().get("transactionId"));
        assertTrue(response.getBody().get("transactionId").toString().startsWith("TXN-"));
        assertEquals("Paiement effectué avec succès", response.getBody().get("message"));
        assertEquals("CARD_SIMULATED", response.getBody().get("paymentMethod"));
    }

    @Test
    void simulatePayment_withEmptyRequest_stillReturnsSuccess() {
        ResponseEntity<Map<String, Object>> response =
                paymentController.simulatePayment(new HashMap<>());

        assertTrue((Boolean) response.getBody().get("success"));
        assertNotNull(response.getBody().get("transactionId"));
    }
}