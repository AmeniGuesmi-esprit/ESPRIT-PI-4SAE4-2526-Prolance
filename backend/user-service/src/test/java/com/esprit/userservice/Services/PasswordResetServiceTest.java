package com.esprit.userservice.Services;

import com.esprit.userservice.Entities.PasswordResetToken;
import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.PasswordResetTokenRepository;
import com.esprit.userservice.Repositories.UserRepository;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;
    @Mock private EmailService emailService;

    @InjectMocks
    private PasswordResetService passwordResetService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1);
        user.setEmail("alice@test.com");
        user.setPassword("encodedOldPassword");
        user.setName("Alice");
    }

    // ── requestReset ──────────────────────────────────────────────────────────

    @Test
    void requestReset_shouldSaveTokenAndSendEmail_whenUserExists() throws MessagingException {
        when(userRepository.findByEmail("alice@test.com")).thenReturn(Optional.of(user));
        doNothing().when(emailService).sendPasswordResetEmail(anyString(), anyString());

        passwordResetService.requestReset("alice@test.com");

        verify(tokenRepository).deleteByUser_Id(1);
        verify(tokenRepository).save(any(PasswordResetToken.class));
        verify(emailService).sendPasswordResetEmail(eq("alice@test.com"), anyString());
    }

    @Test
    void requestReset_shouldThrow_whenUserNotFound() {
        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> passwordResetService.requestReset("unknown@test.com"));
        verify(tokenRepository, never()).save(any());
    }

    // ── validateToken ─────────────────────────────────────────────────────────

    @Test
    void validateToken_shouldReturnTrue_whenTokenIsValid() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(token.isExpired()).thenReturn(false);
        when(token.isUsed()).thenReturn(false);
        when(tokenRepository.findByToken("valid-token")).thenReturn(Optional.of(token));

        assertTrue(passwordResetService.validateToken("valid-token"));
    }

    @Test
    void validateToken_shouldReturnFalse_whenTokenIsExpired() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(token.isExpired()).thenReturn(true);
        when(tokenRepository.findByToken("expired-token")).thenReturn(Optional.of(token));

        assertFalse(passwordResetService.validateToken("expired-token"));
    }

    @Test
    void validateToken_shouldReturnFalse_whenTokenIsUsed() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(token.isExpired()).thenReturn(false);
        when(token.isUsed()).thenReturn(true);
        when(tokenRepository.findByToken("used-token")).thenReturn(Optional.of(token));

        assertFalse(passwordResetService.validateToken("used-token"));
    }

    @Test
    void validateToken_shouldReturnFalse_whenTokenNotFound() {
        when(tokenRepository.findByToken("ghost-token")).thenReturn(Optional.empty());
        assertFalse(passwordResetService.validateToken("ghost-token"));
    }

    // ── resetPassword ─────────────────────────────────────────────────────────

    @Test
    void resetPassword_shouldUpdatePasswordAndMarkTokenUsed() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(token.isExpired()).thenReturn(false);
        when(token.isUsed()).thenReturn(false);
        when(token.getUser()).thenReturn(user);
        when(tokenRepository.findByToken("good-token")).thenReturn(Optional.of(token));
        when(userRepository.save(any())).thenReturn(user);

        passwordResetService.resetPassword("good-token", "newPassword123");

        verify(userRepository).save(user);
        verify(token).setUsed(true);
        verify(tokenRepository).save(token);
    }

    @Test
    void resetPassword_shouldThrow_whenTokenNotFound() {
        when(tokenRepository.findByToken("bad-token")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> passwordResetService.resetPassword("bad-token", "newPassword"));
    }

    @Test
    void resetPassword_shouldThrow_whenTokenExpired() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(token.isExpired()).thenReturn(true);
        when(tokenRepository.findByToken("expired-token")).thenReturn(Optional.of(token));

        assertThrows(RuntimeException.class,
                () -> passwordResetService.resetPassword("expired-token", "newPassword"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_shouldThrow_whenTokenAlreadyUsed() {
        PasswordResetToken token = mock(PasswordResetToken.class);
        when(token.isExpired()).thenReturn(false);
        when(token.isUsed()).thenReturn(true);
        when(tokenRepository.findByToken("used-token")).thenReturn(Optional.of(token));

        assertThrows(RuntimeException.class,
                () -> passwordResetService.resetPassword("used-token", "newPassword"));
        verify(userRepository, never()).save(any());
    }
}
