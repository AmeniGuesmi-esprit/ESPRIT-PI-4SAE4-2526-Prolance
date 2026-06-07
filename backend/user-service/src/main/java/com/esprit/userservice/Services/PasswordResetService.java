package com.esprit.userservice.Services;

import com.esprit.userservice.Entities.PasswordResetToken;
import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.PasswordResetTokenRepository;
import com.esprit.userservice.Repositories.UserRepository;
import jakarta.mail.MessagingException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PasswordResetService {

    private final UserRepository              userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService                emailService;
    private final BCryptPasswordEncoder       passwordEncoder;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                EmailService emailService) {
        this.userRepository  = userRepository;
        this.tokenRepository = tokenRepository;
        this.emailService    = emailService;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    // ── Step 1: Request reset — generates token + sends email ──
    @Transactional
    public void requestReset(String email) throws MessagingException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No account found with this email"));

        // Delete any existing token for this user
        tokenRepository.deleteByUser_Id(user.getId());

        // Generate secure random token
        String rawToken = UUID.randomUUID().toString();

        PasswordResetToken resetToken = new PasswordResetToken(rawToken, user);
        tokenRepository.save(resetToken);

        emailService.sendPasswordResetEmail(email, rawToken);
    }

    // ── Step 2: Validate token ────────────────────────────────
    public boolean validateToken(String token) {
        return tokenRepository.findByToken(token)
                .map(t -> !t.isExpired() && !t.isUsed())
                .orElse(false);
    }

    // ── Step 3: Reset password ────────────────────────────────
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired token"));

        if (resetToken.isExpired() || resetToken.isUsed()) {
            throw new RuntimeException("Token has expired or already been used");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }
}