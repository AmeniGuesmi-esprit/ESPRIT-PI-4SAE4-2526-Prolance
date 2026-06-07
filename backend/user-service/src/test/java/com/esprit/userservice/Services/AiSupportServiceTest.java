package com.esprit.userservice.Services;

import com.esprit.userservice.Entities.Role;
import com.esprit.userservice.Entities.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests the fallback answer logic of AiSupportService without hitting Groq.
 */
@ExtendWith(MockitoExtension.class)
class AiSupportServiceTest {

    private AiSupportService service;
    private User activeUser;

    @BeforeEach
    void setUp() {
        service = new AiSupportService();
        ReflectionTestUtils.setField(service, "apiKey", "dummy-key");

        activeUser = new User();
        activeUser.setId(1);
        activeUser.setName("Alice");
        activeUser.setLastName("Smith");
        activeUser.setEmail("alice@test.com");
        activeUser.setRole(Role.CLIENT);
        activeUser.setEnabled(true);
        activeUser.setEmailVerified(true);
        activeUser.setTimedOut(false);
        activeUser.setReportCount(0);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String callFallback(User user, String question) throws Exception {
        Method m = AiSupportService.class.getDeclaredMethod("fallbackAnswer", User.class, String.class);
        m.setAccessible(true);
        return (String) m.invoke(service, user, question);
    }

    // ── fallbackAnswer branches ───────────────────────────────────────────────

    @Test
    void fallback_shouldConfirmActiveAccount_onDisabledQuery() throws Exception {
        String answer = callFallback(activeUser, "Is my account disabled?");
        assertTrue(answer.toLowerCase().contains("active"));
    }

    @Test
    void fallback_shouldReportDeactivation_whenAccountDisabled() throws Exception {
        activeUser.setEnabled(false);
        String answer = callFallback(activeUser, "My account is blocked, help!");
        assertTrue(answer.toLowerCase().contains("deactivated") || answer.toLowerCase().contains("support"));
    }

    @Test
    void fallback_shouldReportTimeout_whenUserIsTimedOut() throws Exception {
        activeUser.setTimedOut(true);
        activeUser.setTimeoutUntil(LocalDateTime.of(2099, 1, 1, 0, 0));
        String answer = callFallback(activeUser, "Why am I timed out?");
        assertTrue(answer.contains("2099"));
    }

    @Test
    void fallback_shouldConfirmNoTimeout_whenNotTimedOut() throws Exception {
        String answer = callFallback(activeUser, "Am I timed out?");
        assertTrue(answer.toLowerCase().contains("no active timeout"));
    }

    @Test
    void fallback_shouldGivePasswordHint_onPasswordQuery() throws Exception {
        String answer = callFallback(activeUser, "How do I change my password?");
        assertTrue(answer.toLowerCase().contains("password"));
    }

    @Test
    void fallback_shouldShowReportCount_onReportQuery() throws Exception {
        activeUser.setReportCount(2);
        String answer = callFallback(activeUser, "How many reports do I have?");
        assertTrue(answer.contains("2"));
    }

    @Test
    void fallback_shouldConfirmVerifiedEmail_whenVerified() throws Exception {
        String answer = callFallback(activeUser, "Is my email verified?");
        assertTrue(answer.toLowerCase().contains("verified"));
    }

    @Test
    void fallback_shouldPromptVerification_whenEmailNotVerified() throws Exception {
        activeUser.setEmailVerified(false);
        String answer = callFallback(activeUser, "Please verify my email");
        assertTrue(answer.toLowerCase().contains("verify") || answer.toLowerCase().contains("inbox"));
    }

    @Test
    void fallback_shouldReturnSupportContact_forUnknownQuery() throws Exception {
        String answer = callFallback(activeUser, "How do I become a top freelancer?");
        assertTrue(answer.contains("support@pidev.tn"));
    }

    // ── buildSystemPrompt — active user ──────────────────────────────────────

    @Test
    void buildSystemPrompt_shouldContainUserDetails_forActiveUser() throws Exception {
        Method m = AiSupportService.class.getDeclaredMethod("buildSystemPrompt", User.class);
        m.setAccessible(true);
        String prompt = (String) m.invoke(service, activeUser);

        assertTrue(prompt.contains("Alice"));
        assertTrue(prompt.contains("alice@test.com"));
        assertTrue(prompt.contains("CLIENT"));
        assertTrue(prompt.contains("ACTIVE"));
    }

    @Test
    void buildSystemPrompt_shouldMentionDeactivation_forDisabledUser() throws Exception {
        activeUser.setEnabled(false);
        Method m = AiSupportService.class.getDeclaredMethod("buildSystemPrompt", User.class);
        m.setAccessible(true);
        String prompt = (String) m.invoke(service, activeUser);
        assertTrue(prompt.toUpperCase().contains("DEACTIVATED"));
    }

    @Test
    void buildSystemPrompt_shouldMentionTimeout_forTimedOutUser() throws Exception {
        activeUser.setTimedOut(true);
        activeUser.setTimeoutUntil(LocalDateTime.of(2099, 6, 1, 12, 0));
        Method m = AiSupportService.class.getDeclaredMethod("buildSystemPrompt", User.class);
        m.setAccessible(true);
        String prompt = (String) m.invoke(service, activeUser);
        assertTrue(prompt.toUpperCase().contains("TIMED OUT"));
    }

    @Test
    void buildSystemPrompt_shouldHandleNullRole() throws Exception {
        activeUser.setRole(null);
        Method m = AiSupportService.class.getDeclaredMethod("buildSystemPrompt", User.class);
        m.setAccessible(true);
        String prompt = (String) m.invoke(service, activeUser);
        assertTrue(prompt.contains("USER")); // fallback label
    }
}
