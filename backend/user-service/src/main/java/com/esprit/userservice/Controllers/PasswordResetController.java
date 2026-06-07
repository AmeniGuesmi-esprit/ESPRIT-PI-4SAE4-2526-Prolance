package com.esprit.userservice.Controllers;

import com.esprit.userservice.Services.PasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    // POST /api/auth/forgot-password
    // Body: { "email": "user@example.com" }
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        try {
            passwordResetService.requestReset(email);
            // Always return 200 even if email not found (security best practice —
            // don't reveal whether an account exists)
            return ResponseEntity.ok("Reset email sent if account exists");
        } catch (Exception e) {
            // Log but don't expose error details to client
            System.err.println("Password reset error: " + e.getMessage());
            return ResponseEntity.ok("Reset email sent if account exists");
        }
    }

    // GET /api/auth/validate-reset-token?token=xxx
    @GetMapping("/validate-reset-token")
    public ResponseEntity<?> validateToken(@RequestParam String token) {
        boolean valid = passwordResetService.validateToken(token);
        if (valid) {
            return ResponseEntity.ok(Map.of("valid", true));
        } else {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", "Token invalid or expired"));
        }
    }

    // POST /api/auth/reset-password
    // Body: { "token": "xxx", "newPassword": "NewPass123!" }
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token       = body.get("token");
        String newPassword = body.get("newPassword");

        if (token == null || newPassword == null) {
            return ResponseEntity.badRequest().body("Token and new password are required");
        }

        try {
            passwordResetService.resetPassword(token, newPassword);
            return ResponseEntity.ok("Password reset successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}