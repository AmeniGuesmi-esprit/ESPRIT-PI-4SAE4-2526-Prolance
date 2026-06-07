package com.esprit.userservice.Controllers;

import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.UserRepository;
import com.esprit.userservice.Services.AuthService;
import com.esprit.userservice.Services.JwtService;
import com.esprit.userservice.dto.AuthRequest;
import com.esprit.userservice.dto.AuthResponse;
import com.esprit.userservice.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class AuthControllerTest {

    @Mock AuthService authService;
    @Mock UserRepository userRepository;
    @Mock JwtService jwtService;

    AuthController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new AuthController(authService, userRepository, jwtService);
    }

    // ── login ──────────────────────────────────────────────────────────────

    @Test
    void login_delegatesToAuthService() {
        AuthRequest req = new AuthRequest("a@b.com", "pass");
        AuthResponse expected = new AuthResponse(1, "tok", "CLIENT", "A", "B", null);
        when(authService.login(req)).thenReturn(expected);

        AuthResponse result = controller.login(req);

        assertThat(result).isSameAs(expected);
    }

    // ── register ───────────────────────────────────────────────────────────

    @Test
    void register_returns200WithMessage() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("x@y.com");

        ResponseEntity<?> resp = controller.register(req);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
        assertThat(resp.getBody().toString()).contains("Registration successful");
        verify(authService).register(req);
    }

    // ── faceLogin ─────────────────────────────────────────────────────────

    @Test
    void faceLogin_missingEmail_returns400() {
        com.esprit.userservice.dto.FaceLoginRequest req = new com.esprit.userservice.dto.FaceLoginRequest();
        req.setEmail(null);

        ResponseEntity<?> resp = controller.faceLogin(req);

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    @Test
    void faceLogin_blankEmail_returns400() {
        com.esprit.userservice.dto.FaceLoginRequest req = new com.esprit.userservice.dto.FaceLoginRequest();
        req.setEmail("   ");

        ResponseEntity<?> resp = controller.faceLogin(req);

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── resendVerification ────────────────────────────────────────────────

    @Test
    void resendVerification_missingEmail_returns400() {
        ResponseEntity<?> resp = controller.resendVerification(Map.of());

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    @Test
    void resendVerification_validEmail_returns200() {
        doNothing().when(authService).resendVerification("a@b.com");

        ResponseEntity<?> resp = controller.resendVerification(Map.of("email", "a@b.com"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void resendVerification_serviceThrows_returns400() {
        doThrow(new RuntimeException("not found")).when(authService).resendVerification("bad@b.com");

        ResponseEntity<?> resp = controller.resendVerification(Map.of("email", "bad@b.com"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── getAllUsers ────────────────────────────────────────────────────────

    @Test
    void getAllUsers_returnsListFromService() {
        User u = new User();
        u.setEmail("a@b.com");
        when(authService.getAllUsers()).thenReturn(List.of(u));

        List<User> result = controller.getAllUsers();

        assertThat(result).hasSize(1);
    }

    // ── deleteUser ─────────────────────────────────────────────────────────

    @Test
    void deleteUser_callsRepository() {
        controller.deleteUser(5);

        verify(userRepository).deleteById(5);
    }

    // ── verifyEmail ────────────────────────────────────────────────────────

    @Test
    void verifyEmail_success_redirectsWithVerifiedTrue() throws Exception {
        HttpServletResponse response = mock(HttpServletResponse.class);
        doNothing().when(authService).verifyEmail("tok");

        controller.verifyEmail("tok", response);

        verify(response).sendRedirect(contains("verified=true"));
    }

    @Test
    void verifyEmail_failure_redirectsWithVerifiedFalse() throws Exception {
        HttpServletResponse response = mock(HttpServletResponse.class);
        doThrow(new RuntimeException("expired")).when(authService).verifyEmail("bad");

        controller.verifyEmail("bad", response);

        verify(response).sendRedirect(contains("verified=false"));
    }
}
