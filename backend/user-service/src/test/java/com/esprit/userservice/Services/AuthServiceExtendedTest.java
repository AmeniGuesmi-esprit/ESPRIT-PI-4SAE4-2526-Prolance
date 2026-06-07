package com.esprit.userservice.Services;

import com.esprit.userservice.Entities.EmailVerificationToken;
import com.esprit.userservice.Entities.Role;
import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.EmailVerificationTokenRepository;
import com.esprit.userservice.Repositories.UserRepository;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceExtendedTest {

    @Mock private UserRepository userRepository;
    @Mock private EmailVerificationTokenRepository verificationTokenRepository;
    @Mock private EmailService emailService;
    @Mock private JwtService jwtService;
    @Mock private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1);
        user.setEmail("alice@test.com");
        user.setName("Alice");
        user.setLastName("Smith");
        user.setRole(Role.CLIENT);
        user.setEnabled(true);
        user.setEmailVerified(false);
        user.setTimedOut(false);
    }

    // ── verifyEmail ───────────────────────────────────────────────────────────

    @Test
    void verifyEmail_shouldVerifyUser_whenTokenIsValid() {
        EmailVerificationToken token = mock(EmailVerificationToken.class);
        when(token.isExpired()).thenReturn(false);
        when(token.isUsed()).thenReturn(false);
        when(token.getUser()).thenReturn(user);
        when(verificationTokenRepository.findByToken("good-token")).thenReturn(Optional.of(token));

        authService.verifyEmail("good-token");

        assertTrue(user.isEmailVerified());
        verify(userRepository).save(user);
        verify(token).setUsed(true);
        verify(verificationTokenRepository).save(token);
    }

    @Test
    void verifyEmail_shouldThrow400_whenTokenNotFound() {
        when(verificationTokenRepository.findByToken("missing")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.verifyEmail("missing"));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void verifyEmail_shouldThrow400_whenTokenExpired() {
        EmailVerificationToken token = mock(EmailVerificationToken.class);
        when(token.isExpired()).thenReturn(true);
        when(verificationTokenRepository.findByToken("expired")).thenReturn(Optional.of(token));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.verifyEmail("expired"));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void verifyEmail_shouldThrow400_whenTokenAlreadyUsed() {
        EmailVerificationToken token = mock(EmailVerificationToken.class);
        when(token.isExpired()).thenReturn(false);
        when(token.isUsed()).thenReturn(true);
        when(verificationTokenRepository.findByToken("used")).thenReturn(Optional.of(token));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.verifyEmail("used"));
        assertEquals(400, ex.getStatusCode().value());
    }

    // ── resendVerification ────────────────────────────────────────────────────

    @Test
    void resendVerification_shouldSendEmail_whenUserExistsAndNotVerified() throws MessagingException {
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(user));
        doNothing().when(emailService).sendVerificationEmail(anyString(), anyString());

        authService.resendVerification("alice@test.com");

        verify(verificationTokenRepository).deleteByUser_Id(1);
        verify(verificationTokenRepository).save(any(EmailVerificationToken.class));
        verify(emailService).sendVerificationEmail(eq("alice@test.com"), anyString());
    }

    @Test
    void resendVerification_shouldThrow404_whenUserNotFound() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.resendVerification("unknown@test.com"));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void resendVerification_shouldThrow400_whenEmailAlreadyVerified() {
        user.setEmailVerified(true);
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(user));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.resendVerification("alice@test.com"));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void resendVerification_shouldThrow500_whenEmailFails() throws MessagingException {
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(user));
        doThrow(new MessagingException("SMTP error"))
                .when(emailService).sendVerificationEmail(anyString(), anyString());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.resendVerification("alice@test.com"));
        assertEquals(500, ex.getStatusCode().value());
    }
}
