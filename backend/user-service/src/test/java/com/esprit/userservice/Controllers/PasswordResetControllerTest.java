package com.esprit.userservice.Controllers;

import com.esprit.userservice.Services.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PasswordResetControllerTest {

    @Mock PasswordResetService passwordResetService;
    PasswordResetController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new PasswordResetController(passwordResetService);
    }

    // ── forgotPassword ─────────────────────────────────────────────────────

    @Test
    void forgotPassword_missingEmail_returns400() {
        ResponseEntity<?> resp = controller.forgotPassword(Map.of());

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    @Test
    void forgotPassword_blankEmail_returns400() {
        ResponseEntity<?> resp = controller.forgotPassword(Map.of("email", "  "));

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    @Test
    void forgotPassword_validEmail_returns200() throws Exception {
        doNothing().when(passwordResetService).requestReset("a@b.com");

        ResponseEntity<?> resp = controller.forgotPassword(Map.of("email", "a@b.com"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void forgotPassword_serviceThrows_stillReturns200() throws Exception {
        doThrow(new RuntimeException("fail")).when(passwordResetService).requestReset("a@b.com");

        ResponseEntity<?> resp = controller.forgotPassword(Map.of("email", "a@b.com"));

        // Security best practice: always 200 even on error
        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    // ── validateToken ──────────────────────────────────────────────────────

    @Test
    void validateToken_valid_returns200() {
        when(passwordResetService.validateToken("goodToken")).thenReturn(true);

        ResponseEntity<?> resp = controller.validateToken("goodToken");

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
        assertThat(resp.getBody().toString()).contains("true");
    }

    @Test
    void validateToken_invalid_returns400() {
        when(passwordResetService.validateToken("badToken")).thenReturn(false);

        ResponseEntity<?> resp = controller.validateToken("badToken");

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── resetPassword ──────────────────────────────────────────────────────

    @Test
    void resetPassword_missingFields_returns400() {
        ResponseEntity<?> resp = controller.resetPassword(Map.of("token", "tok"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    @Test
    void resetPassword_success_returns200() {
        doNothing().when(passwordResetService).resetPassword("tok", "NewPass1!");

        ResponseEntity<?> resp = controller.resetPassword(Map.of("token", "tok", "newPassword", "NewPass1!"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void resetPassword_invalidToken_returns400() {
        doThrow(new RuntimeException("Token expired")).when(passwordResetService).resetPassword("bad", "pass");

        ResponseEntity<?> resp = controller.resetPassword(Map.of("token", "bad", "newPassword", "pass"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }
}