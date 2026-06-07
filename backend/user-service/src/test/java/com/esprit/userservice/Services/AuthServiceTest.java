package com.esprit.userservice.Services;

import com.esprit.userservice.Entities.Role;
import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.EmailVerificationTokenRepository;
import com.esprit.userservice.Repositories.UserRepository;
import com.esprit.userservice.dto.AuthRequest;
import com.esprit.userservice.dto.AuthResponse;
import com.esprit.userservice.dto.RegisterRequest;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private EmailService emailService;

    @Mock
    private EmailVerificationTokenRepository verificationTokenRepository;

    @InjectMocks
    private AuthService authService;

    private User validUser;

    @BeforeEach
    void setUp() {
        validUser = new User();
        validUser.setId(1);
        validUser.setEmail("test@test.com");
        validUser.setPassword("encodedPassword");
        validUser.setName("Test");
        validUser.setLastName("User");
        validUser.setRole(Role.CLIENT);
        validUser.setEnabled(true);
        validUser.setEmailVerified(true);
        validUser.setTimedOut(false);
    }

    // ── LOGIN TESTS ───────────────────────────────────────────────────────────

    @Test
    void login_shouldSucceed_whenCredentialsAreValid() {
        AuthRequest request = new AuthRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(validUser));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
        when(jwtService.generateToken("test@test.com", "CLIENT")).thenReturn("mock-jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("mock-jwt-token", response.getToken());
        assertEquals("CLIENT", response.getRole());
        verify(jwtService, times(1)).generateToken("test@test.com", "CLIENT");
    }

    @Test
    void login_shouldThrow401_whenUserNotFound() {
        AuthRequest request = new AuthRequest();
        request.setEmail("unknown@test.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(401, ex.getStatusCode().value());
    }

    @Test
    void login_shouldThrow401_whenPasswordIsWrong() {
        AuthRequest request = new AuthRequest();
        request.setEmail("test@test.com");
        request.setPassword("wrongpassword");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(validUser));
        when(passwordEncoder.matches("wrongpassword", "encodedPassword")).thenReturn(false);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(401, ex.getStatusCode().value());
    }

    @Test
    void login_shouldThrow403_whenEmailNotVerified() {
        validUser.setEmailVerified(false);

        AuthRequest request = new AuthRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(validUser));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(403, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("email-not-verified"));
    }

    @Test
    void login_shouldThrow403_whenAccountIsDisabled() {
        validUser.setEnabled(false);

        AuthRequest request = new AuthRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(validUser));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void login_shouldThrow423_whenAccountIsTimedOut() {
        validUser.setTimedOut(true);
        validUser.setTimeoutUntil(LocalDateTime.now().plusHours(1));

        AuthRequest request = new AuthRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(validUser));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(423, ex.getStatusCode().value());
    }

    @Test
    void login_shouldSucceed_whenTimeoutHasExpired() {
        validUser.setTimedOut(true);
        validUser.setTimeoutUntil(LocalDateTime.now().minusHours(1));

        AuthRequest request = new AuthRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(validUser));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenReturn(validUser);
        when(jwtService.generateToken(anyString(), anyString())).thenReturn("mock-jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertFalse(validUser.isTimedOut());
        assertNull(validUser.getTimeoutUntil());
    }

    // ── REGISTER TESTS ────────────────────────────────────────────────────────

    @Test
    void register_shouldSucceed_whenEmailIsNew() throws MessagingException {
        RegisterRequest request = new RegisterRequest();
        request.setName("Farah");
        request.setLastName("Test");
        request.setEmail("farah@test.com");
        request.setPassword("password123");
        request.setRole("CLIENT");
        request.setBirthDate(LocalDate.of(2000, 1, 1));

        when(userRepository.findByEmail("farah@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(validUser);
        when(verificationTokenRepository.save(any())).thenReturn(null);
        doNothing().when(emailService).sendVerificationEmail(anyString(), anyString());

        assertDoesNotThrow(() -> authService.register(request));
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void register_shouldThrow409_whenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@test.com");
        request.setPassword("password123");
        request.setRole("CLIENT");

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(validUser));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> authService.register(request));

        assertEquals(409, ex.getStatusCode().value());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_shouldDefaultToClientRole_whenRoleIsInvalid() throws MessagingException {
        RegisterRequest request = new RegisterRequest();
        request.setName("Test");
        request.setLastName("User");
        request.setEmail("new@test.com");
        request.setPassword("password123");
        request.setRole("INVALIDROLE");
        request.setBirthDate(LocalDate.of(2000, 1, 1));

        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User saved = inv.getArgument(0);
            assertEquals(Role.CLIENT, saved.getRole());
            return saved;
        });
        when(verificationTokenRepository.save(any())).thenReturn(null);
        doNothing().when(emailService).sendVerificationEmail(anyString(), anyString());

        assertDoesNotThrow(() -> authService.register(request));
    }

    @Test
    void register_shouldSetEmailVerifiedToFalse() throws MessagingException {
        RegisterRequest request = new RegisterRequest();
        request.setName("Test");
        request.setLastName("User");
        request.setEmail("new@test.com");
        request.setPassword("password123");
        request.setRole("CLIENT");
        request.setBirthDate(LocalDate.of(2000, 1, 1));

        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User saved = inv.getArgument(0);
            assertFalse(saved.isEmailVerified());
            return saved;
        });
        when(verificationTokenRepository.save(any())).thenReturn(null);
        doNothing().when(emailService).sendVerificationEmail(anyString(), anyString());

        assertDoesNotThrow(() -> authService.register(request));
    }

    // ── GET ALL USERS TEST ────────────────────────────────────────────────────

    @Test
    void getAllUsers_shouldReturnAllUsers() {
        when(userRepository.findAll()).thenReturn(List.of(validUser));

        List<User> users = authService.getAllUsers();

        assertEquals(1, users.size());
        assertEquals("test@test.com", users.get(0).getEmail());
    }
}