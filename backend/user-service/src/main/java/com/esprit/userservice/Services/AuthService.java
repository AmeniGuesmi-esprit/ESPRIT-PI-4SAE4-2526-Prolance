package com.esprit.userservice.Services;

import com.esprit.userservice.Entities.EmailVerificationToken;
import com.esprit.userservice.Entities.Role;
import com.esprit.userservice.dto.AuthRequest;
import com.esprit.userservice.dto.AuthResponse;
import com.esprit.userservice.dto.RegisterRequest;
import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.EmailVerificationTokenRepository;
import com.esprit.userservice.Repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final EmailVerificationTokenRepository verificationTokenRepository;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       EmailService emailService,
                       EmailVerificationTokenRepository verificationTokenRepository) {
        this.userRepository              = userRepository;
        this.passwordEncoder             = passwordEncoder;
        this.jwtService                  = jwtService;
        this.emailService                = emailService;
        this.verificationTokenRepository = verificationTokenRepository;
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        // ── Email not verified → 403 with specific message ──
        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "email-not-verified");
        }

        // ── Deactivated account → 403 ──
        if (!user.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "deactivated");
        }

        // ── Timed out account → 423 ──
        if (user.isTimedOut() && user.getTimeoutUntil() != null) {
            if (LocalDateTime.now().isBefore(user.getTimeoutUntil())) {
                throw new ResponseStatusException(HttpStatus.LOCKED, "suspended");
            } else {
                user.setTimedOut(false);
                user.setTimeoutUntil(null);
                userRepository.save(user);
            }
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(user.getId(), token, user.getRole().name(), user.getName(), user.getLastName(), user.getAvatar());    }

    @Transactional
    public void register(RegisterRequest request) {
        // ── Check if email already taken ──
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setName(request.getName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setBirthDate(request.getBirthDate());
        user.setEnabled(true);
        user.setEmailVerified(false); // ← not verified yet

        Role role;
        try {
            role = Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            role = Role.CLIENT;
        }
        user.setRole(role);

        userRepository.save(user);

        // ── Generate verification token and send email ──
        String rawToken = UUID.randomUUID().toString();
        EmailVerificationToken verificationToken = new EmailVerificationToken(rawToken, user);
        verificationTokenRepository.save(verificationToken);

        try {
            emailService.sendVerificationEmail(user.getEmail(), rawToken);
        } catch (Exception e) {
            System.err.println("Failed to send verification email: " + e.getMessage());
            // Don't fail registration if email fails — user can request resend
        }
    }

    // ── Verify email token ────────────────────────────────────────────────────
    @Transactional
    public void verifyEmail(String token) {
        EmailVerificationToken verificationToken = verificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification link"));

        if (verificationToken.isExpired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification link has expired. Please register again.");
        }

        if (verificationToken.isUsed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This link has already been used.");
        }

        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);

        verificationToken.setUsed(true);
        verificationTokenRepository.save(verificationToken);
    }

    // ── Resend verification email ─────────────────────────────────────────────
    @Transactional
    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found"));

        if (user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already verified");
        }

        // Delete old token
        verificationTokenRepository.deleteByUser_Id(user.getId());

        // Generate new token
        String rawToken = UUID.randomUUID().toString();
        EmailVerificationToken verificationToken = new EmailVerificationToken(rawToken, user);
        verificationTokenRepository.save(verificationToken);

        try {
            emailService.sendVerificationEmail(user.getEmail(), rawToken);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to send email");
        }
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}