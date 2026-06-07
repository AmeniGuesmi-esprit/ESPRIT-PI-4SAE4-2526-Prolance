package com.esprit.userservice.Services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests the rule-based fallback logic of AiModerationService without hitting the Groq API.
 * The private fallbackVerdict method is exercised via reflection so we get
 * full branch coverage without needing a live HTTP call.
 */
@ExtendWith(MockitoExtension.class)
class AiModerationServiceTest {

    private AiModerationService service;

    @BeforeEach
    void setUp() {
        service = new AiModerationService();
        // Inject a dummy key so the field is not null (won't be used in fallback tests)
        ReflectionTestUtils.setField(service, "apiKey", "dummy-key");
    }

    // ── Fallback verdict logic (via reflection) ───────────────────────────────

    private AiModerationService.ModerationVerdict callFallback(int count, String category, String reason)
            throws Exception {
        Method m = AiModerationService.class.getDeclaredMethod(
                "fallbackVerdict", int.class, String.class, String.class);
        m.setAccessible(true);
        return (AiModerationService.ModerationVerdict) m.invoke(service, count, category, reason);
    }

    @Test
    void fallback_shouldReturnWarn_forFirstNonSeriousReport() throws Exception {
        AiModerationService.ModerationVerdict v = callFallback(0, "spam", "spamming");
        assertEquals("low",  v.severity());
        assertEquals("warn", v.action());
        assertNotNull(v.justification());
    }

    @Test
    void fallback_shouldReturnTimeout_forTwoReports() throws Exception {
        AiModerationService.ModerationVerdict v = callFallback(2, "spam", "repeat spam");
        assertEquals("medium",  v.severity());
        assertEquals("timeout", v.action());
    }

    @Test
    void fallback_shouldReturnDeactivate_forThreeOrMoreReports() throws Exception {
        AiModerationService.ModerationVerdict v = callFallback(3, "spam", "too many");
        assertEquals("high",       v.severity());
        assertEquals("deactivate", v.action());
    }

    @Test
    void fallback_shouldEscalate_forSeriousCategory_fraud() throws Exception {
        // 1 report + serious category (adds 2) = effective 3 → deactivate
        AiModerationService.ModerationVerdict v = callFallback(1, "fraud", "scam");
        assertEquals("high",       v.severity());
        assertEquals("deactivate", v.action());
    }

    @Test
    void fallback_shouldEscalate_forSeriousCategory_harassment() throws Exception {
        AiModerationService.ModerationVerdict v = callFallback(0, "harassment", "threatening messages");
        // 0 + 2 = effective 2 → timeout
        assertEquals("medium",  v.severity());
        assertEquals("timeout", v.action());
    }

    @Test
    void fallback_shouldEscalate_forSeriousCategory_abuse() throws Exception {
        AiModerationService.ModerationVerdict v = callFallback(1, "abuse", "verbal abuse");
        assertEquals("high", v.severity());
        assertEquals("deactivate", v.action());
    }

    @Test
    void fallback_shouldHandleNullCategory() throws Exception {
        AiModerationService.ModerationVerdict v = callFallback(0, null, null);
        assertEquals("low",  v.severity());
        assertEquals("warn", v.action());
    }

    // ── ModerationVerdict record ──────────────────────────────────────────────

    @Test
    void moderationVerdict_shouldExposeAllFields() {
        AiModerationService.ModerationVerdict v =
                new AiModerationService.ModerationVerdict("high", "deactivate", "Too many reports.");
        assertEquals("high",       v.severity());
        assertEquals("deactivate", v.action());
        assertEquals("Too many reports.", v.justification());
    }
}
