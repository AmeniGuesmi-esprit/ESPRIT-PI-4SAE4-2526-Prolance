package tn.esprit.microservice.promoservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tn.esprit.microservice.promoservice.Entity.PromoCode;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class PromoCodeTest {

    private PromoCode promo;

    @BeforeEach
    void setUp() {
        promo = new PromoCode();
        promo.setCode("SUMMER2026");
        promo.setDiscountPercent(25);
        promo.setMaxUses(100);
        promo.setCurrentUses(0);
        promo.setIsActive(true);
        promo.setExpiresAt(LocalDateTime.now().plusDays(30));
    }

    @Test
    void isValid_whenActiveAndNotExpiredAndHasUsesLeft_returnsTrue() {
        assertTrue(promo.isValid());
    }

    @Test
    void isValid_whenInactive_returnsFalse() {
        promo.setIsActive(false);
        assertFalse(promo.isValid());
    }

    @Test
    void isValid_whenExpired_returnsFalse() {
        promo.setExpiresAt(LocalDateTime.now().minusDays(1));
        assertFalse(promo.isValid());
    }

    @Test
    void isValid_whenMaxUsesReached_returnsFalse() {
        promo.setCurrentUses(100);
        assertFalse(promo.isValid());
    }

    @Test
    void isValid_whenExpiresAtIsNull_returnsTrue() {
        promo.setExpiresAt(null);
        assertTrue(promo.isValid());
    }

    @Test
    void incrementUses_increasesCurrentUsesByOne() {
        promo.setCurrentUses(5);
        promo.incrementUses();
        assertEquals(6, promo.getCurrentUses());
    }

    @Test
    void gettersAndSetters_workCorrectly() {
        promo.setId(1L);
        promo.setDescription("Offre spéciale");

        assertEquals(1L, promo.getId());
        assertEquals("SUMMER2026", promo.getCode());
        assertEquals(25, promo.getDiscountPercent());
        assertEquals(100, promo.getMaxUses());
        assertEquals("Offre spéciale", promo.getDescription());
        assertTrue(promo.getIsActive());
        assertNotNull(promo.getExpiresAt());
    }
}