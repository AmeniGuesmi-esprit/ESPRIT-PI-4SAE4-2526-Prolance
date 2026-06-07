package com.esprit.userservice.Services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests the fallback bio generation logic of AiBioService without hitting Groq.
 */
@ExtendWith(MockitoExtension.class)
class AiBioServiceTest {

    private AiBioService service;

    @BeforeEach
    void setUp() {
        service = new AiBioService();
        ReflectionTestUtils.setField(service, "apiKey", "dummy-key");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String callFallback(String first, String last, String role, String tone, String extra)
            throws Exception {
        Method m = AiBioService.class.getDeclaredMethod(
                "fallbackBio", String.class, String.class, String.class, String.class, String.class);
        m.setAccessible(true);
        return (String) m.invoke(service, first, last, role, tone, extra);
    }

    // ── Fallback bio branches ─────────────────────────────────────────────────

    @Test
    void fallback_shouldReturnFreelancerBio_forFreelancerRole() throws Exception {
        String bio = callFallback("Alice", "Smith", "FREELANCER", "professional", null);
        assertTrue(bio.contains("Alice Smith"));
        assertTrue(bio.toLowerCase().contains("freelancer"));
    }

    @Test
    void fallback_shouldReturnClientBio_forClientRole() throws Exception {
        String bio = callFallback("Bob", "Jones", "CLIENT", "casual", null);
        assertTrue(bio.contains("Bob Jones"));
        assertTrue(bio.toLowerCase().contains("client"));
    }

    @Test
    void fallback_shouldReturnGenericBio_forAdminOrUnknownRole() throws Exception {
        String bio = callFallback("Carol", "White", "ADMIN", "professional", null);
        assertTrue(bio.contains("Carol White"));
    }

    @Test
    void fallback_shouldAppendExtra_whenExtraIsProvided() throws Exception {
        String bio = callFallback("Alice", "Smith", "FREELANCER", "professional", "Specialises in React.");
        assertTrue(bio.contains("Specialises in React."));
    }

    @Test
    void fallback_shouldNotAppendExtra_whenExtraIsNull() throws Exception {
        String bio = callFallback("Alice", "Smith", "FREELANCER", "professional", null);
        // Should still be a valid bio with no NullPointerException
        assertNotNull(bio);
        assertFalse(bio.isBlank());
    }

    @Test
    void fallback_shouldNotAppendExtra_whenExtraIsBlank() throws Exception {
        String bio = callFallback("Alice", "Smith", "FREELANCER", "professional", "   ");
        assertNotNull(bio);
        // blank extra should not be appended
        assertFalse(bio.endsWith("   "));
    }

    @Test
    void fallback_shouldHandleUnknownRole() throws Exception {
        String bio = callFallback("Dave", "Brown", "UNKNOWN_ROLE", "casual", null);
        assertTrue(bio.contains("Dave Brown"));
    }

    // ── Role/tone switch coverage via generateBio (with broken apiKey → fallback)

    @Test
    void generateBio_shouldReturnFallbackBio_whenApiKeyIsInvalid() {
        // With a dummy key, the HTTP call will fail and the fallback kicks in
        String bio = service.generateBio("Alice", "Smith", "FREELANCER", "professional", null);
        assertNotNull(bio);
        assertFalse(bio.isBlank());
    }

    @Test
    void generateBio_shouldUseFallback_forClientRole() {
        String bio = service.generateBio("Bob", "Jones", "CLIENT", "casual", "Loves design.");
        assertNotNull(bio);
        assertFalse(bio.isBlank());
    }

    @Test
    void generateBio_shouldUseFallback_forCreativeTone() {
        String bio = service.generateBio("Eve", "Taylor", "FREELANCER", "creative", null);
        assertNotNull(bio);
    }

    @Test
    void generateBio_shouldUseFallback_forDefaultRole() {
        String bio = service.generateBio("Frank", "Lee", "MODERATOR", "professional", null);
        assertNotNull(bio);
    }
}
