package com.esprit.userservice.Services;

import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.EmailVerificationTokenRepository;
import com.esprit.userservice.Repositories.PasswordResetTokenRepository;
import com.esprit.userservice.Repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository repo;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailVerificationTokenRepository verificationTokenRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        // UserService uses @Autowired field injection for these — @InjectMocks only
        // handles constructor injection, so we inject them manually via reflection.
        ReflectionTestUtils.setField(userService, "passwordEncoder",             passwordEncoder);
        ReflectionTestUtils.setField(userService, "verificationTokenRepository", verificationTokenRepository);
        ReflectionTestUtils.setField(userService, "tokenRepository",             tokenRepository);

        user = new User();
        user.setId(1);
        user.setName("Alice");
        user.setLastName("Smith");
        user.setEmail("alice@test.com");
        user.setPassword("encodedPassword");
        user.setEnabled(true);
        user.setTimedOut(false);
        user.setReportCount(0);
        user.setEmailVerified(true);
    }

    // ── getById ───────────────────────────────────────────────────────────────

    @Test
    void getById_shouldReturnUser_whenFound() {
        when(repo.findById(1)).thenReturn(Optional.of(user));
        assertEquals("Alice", userService.getById(1).getName());
    }

    @Test
    void getById_shouldThrow_whenNotFound() {
        when(repo.findById(99)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> userService.getById(99));
    }

    // ── getAll ────────────────────────────────────────────────────────────────

    @Test
    void getAll_shouldReturnAllUsers() {
        when(repo.findAll()).thenReturn(List.of(user));
        assertEquals(1, userService.getAll().size());
    }

    // ── searchByName ──────────────────────────────────────────────────────────

    @Test
    void searchByName_shouldReturnEmpty_whenQueryIsNull() {
        assertTrue(userService.searchByName(null).isEmpty());
        verifyNoInteractions(repo);
    }

    @Test
    void searchByName_shouldReturnEmpty_whenQueryIsBlank() {
        assertTrue(userService.searchByName("   ").isEmpty());
    }

    @Test
    void searchByName_shouldDelegateToRepo_whenQueryIsValid() {
        when(repo.searchByName("Alice")).thenReturn(List.of(user));
        assertEquals(1, userService.searchByName("Alice").size());
    }

    // ── updateUser ────────────────────────────────────────────────────────────

    @Test
    void updateUser_shouldUpdateFields_whenProvided() {
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(repo.save(any())).thenReturn(user);

        User details = new User();
        details.setName("Bob");
        details.setLastName("Jones");
        details.setEmail("bob@test.com");

        userService.updateUser(1, details);
        assertEquals("Bob",          user.getName());
        assertEquals("Jones",        user.getLastName());
        assertEquals("bob@test.com", user.getEmail());
    }

    @Test
    void updateUser_shouldNotOverwrite_whenFieldsAreNull() {
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(repo.save(any())).thenReturn(user);

        userService.updateUser(1, new User());
        assertEquals("Alice", user.getName());
    }

    // ── updateAvatar ──────────────────────────────────────────────────────────

    @Test
    void updateAvatar_shouldSetAvatar() {
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(repo.save(any())).thenReturn(user);

        userService.updateAvatar(1, "base64string");
        assertEquals("base64string", user.getAvatar());
    }

    // ── updateBio ─────────────────────────────────────────────────────────────

    @Test
    void updateBio_shouldSetBio() {
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(repo.save(any())).thenReturn(user);

        userService.updateBio(1, "I am a freelancer.");
        assertEquals("I am a freelancer.", user.getBio());
    }

    // ── applyTimeout / liftTimeout ────────────────────────────────────────────

    @Test
    void applyTimeout_shouldSetTimedOut() {
        LocalDateTime until = LocalDateTime.now().plusHours(2);
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(repo.save(any())).thenReturn(user);

        userService.applyTimeout(1, until);
        assertTrue(user.isTimedOut());
        assertEquals(until, user.getTimeoutUntil());
    }

    @Test
    void liftTimeout_shouldClearTimedOut() {
        user.setTimedOut(true);
        user.setTimeoutUntil(LocalDateTime.now().plusHours(1));
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(repo.save(any())).thenReturn(user);

        userService.liftTimeout(1);
        assertFalse(user.isTimedOut());
        assertNull(user.getTimeoutUntil());
    }

    // ── reportUser ────────────────────────────────────────────────────────────

    @Test
    void reportUser_shouldIncrementReportCount() {
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(repo.save(any())).thenReturn(user);

        userService.reportUser(1);
        assertEquals(1, user.getReportCount());
    }

    @Test
    void reportUser_shouldDeactivate_whenCountReachesThree() {
        user.setReportCount(2);
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(repo.save(any())).thenReturn(user);

        userService.reportUser(1);
        assertEquals(3, user.getReportCount());
        assertFalse(user.isEnabled());
    }

    @Test
    void reportUser_shouldNotDeactivate_whenCountIsBelowThree() {
        user.setReportCount(1);
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(repo.save(any())).thenReturn(user);

        userService.reportUser(1);
        assertEquals(2, user.getReportCount());
        assertTrue(user.isEnabled());
    }

    // ── deactivate / reactivate ───────────────────────────────────────────────

    @Test
    void deactivate_shouldDisableUser() {
        when(repo.findById(1)).thenReturn(Optional.of(user));
        userService.deactivate(1);
        assertFalse(user.isEnabled());
        verify(repo).save(user);
    }

    @Test
    void reactivate_shouldEnableUserAndResetReports() {
        user.setEnabled(false);
        user.setReportCount(5);
        when(repo.findById(1)).thenReturn(Optional.of(user));

        userService.reactivate(1);
        assertTrue(user.isEnabled());
        assertEquals(0, user.getReportCount());
    }

    // ── changePassword ────────────────────────────────────────────────────────

    @Test
    void changePassword_shouldSucceed_whenCurrentPasswordMatches() {
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPass", "encodedPassword")).thenReturn(true);
        when(passwordEncoder.encode("newPass")).thenReturn("newEncoded");

        userService.changePassword(1, "oldPass", "newPass");
        assertEquals("newEncoded", user.getPassword());
    }

    @Test
    void changePassword_shouldThrow_whenCurrentPasswordWrong() {
        when(repo.findById(1)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPass", "encodedPassword")).thenReturn(false);

        assertThrows(RuntimeException.class,
                () -> userService.changePassword(1, "wrongPass", "newPass"));
        verify(repo, never()).save(any());
    }

    // ── deleteUser ────────────────────────────────────────────────────────────

    @Test
    void deleteUser_shouldDeleteTokensAndUser() {
        when(repo.findById(1)).thenReturn(Optional.of(user));

        userService.deleteUser(1);

        verify(verificationTokenRepository).deleteByUser_Id(1);
        verify(tokenRepository).deleteByUser_Id(1);
        verify(repo).delete(user);
    }
}