package com.esprit.userservice.Controllers;

import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Services.AiBioService;
import com.esprit.userservice.Services.AiModerationService;
import com.esprit.userservice.Services.AiSupportService;
import com.esprit.userservice.Services.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService          service;
    private final AiModerationService  aiModerationService;
    private final AiBioService         aiBioService;
    private final AiSupportService     aiSupportService;

    public UserController(
            UserService         service,
            AiModerationService aiModerationService,
            AiBioService        aiBioService,
            AiSupportService    aiSupportService
    ) {
        this.service             = service;
        this.aiModerationService = aiModerationService;
        this.aiBioService        = aiBioService;
        this.aiSupportService    = aiSupportService;
    }

    // ── PROFILE ───────────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Integer id) {
        try {
            return ResponseEntity.ok(service.getById(id));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage(), "type", e.getClass().getSimpleName()));
        }
    }

    @GetMapping("/{id}/email")
    public ResponseEntity<String> getUserEmail(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getById(id).getEmail());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Integer id, @RequestBody User userDetails) {
        try {
            User existing = service.getById(id);

            if (userDetails.isTimedOut() && userDetails.getTimeoutUntil() != null) {
                service.applyTimeout(id, userDetails.getTimeoutUntil());
                return ResponseEntity.ok(service.getById(id));
            }
            if (!userDetails.isTimedOut() && existing.isTimedOut()) {
                service.liftTimeout(id);
                return ResponseEntity.ok(service.getById(id));
            }
            if (!userDetails.isEnabled() && existing.isEnabled()) {
                service.deactivate(id);
                return ResponseEntity.ok(service.getById(id));
            }
            if (userDetails.isEnabled() && !existing.isEnabled()) {
                service.reactivate(id);
                return ResponseEntity.ok(service.getById(id));
            }

            return ResponseEntity.ok(service.updateUser(id, userDetails));

        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/{id}/avatar")
    public ResponseEntity<User> updateAvatar(@PathVariable Integer id,
                                             @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.updateAvatar(id, body.get("avatar")));
    }

    @PutMapping("/{id}/bio")
    public ResponseEntity<?> updateBio(@PathVariable Integer id,
                                       @RequestBody Map<String, String> body) {
        try {
            String bio = body.get("bio");
            if (bio == null || bio.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Bio is required"));
            }
            User updated = service.updateBio(id, bio);
            return ResponseEntity.ok(Map.of("bio", updated.getBio()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/change-password")
    public ResponseEntity<?> changePassword(@PathVariable Integer id,
                                            @RequestBody PasswordChangeRequest request) {
        try {
            service.changePassword(id, request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Integer id) {
        try {
            service.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "Account deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<?> deactivate(@PathVariable Integer id) {
        try {
            service.deactivate(id);
            return ResponseEntity.ok(Map.of("message", "User deactivated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── SEARCH & LIST ─────────────────────────────────────────────────────────

    @GetMapping("/search")
    public List<Map<String, Object>> searchUsers(@RequestParam("query") String query) {
        return service.searchByName(query).stream()
                .map(u -> Map.of(
                        "id",       (Object) u.getId(),
                        "name",     u.getName(),
                        "lastName", u.getLastName()
                ))
                .collect(Collectors.toList());
    }

    @GetMapping("/all")
    public List<Map<String, Object>> getAllUsers() {
        return service.getAll().stream()
                .map(u -> Map.of(
                        "id",       (Object) u.getId(),
                        "name",     u.getName(),
                        "lastName", u.getLastName()
                ))
                .collect(Collectors.toList());
    }

    // ── MODERATION ────────────────────────────────────────────────────────────

    @PostMapping("/{id}/report")
    public ResponseEntity<?> reportUser(@PathVariable Integer id) {
        try {
            User updated = service.reportUser(id);
            Map<String, Object> response = new HashMap<>();
            response.put("reportCount", updated.getReportCount());
            response.put("enabled",     updated.isEnabled());
            response.put("message",     updated.getReportCount() >= 3
                    ? "User has been auto-deactivated after 3 reports"
                    : "Report submitted. Warning email sent.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/{id}/timeout")
    public ResponseEntity<?> timeoutUser(@PathVariable Integer id,
                                         @RequestBody Map<String, String> body) {
        try {
            LocalDateTime until = LocalDateTime.parse(body.get("until"));
            User updated = service.applyTimeout(id, until);
            Map<String, Object> response = new HashMap<>();
            response.put("timedOut",     updated.isTimedOut());
            response.put("timeoutUntil", updated.getTimeoutUntil());
            response.put("message",      "Timeout applied until " + updated.getTimeoutUntil());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/{id}/lift-timeout")
    public ResponseEntity<?> liftTimeout(@PathVariable Integer id) {
        try {
            service.liftTimeout(id);
            return ResponseEntity.ok(Map.of("message", "Timeout lifted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── FEATURE 1 — AI REPORT ANALYSIS ───────────────────────────────────────

    @PostMapping("/{id}/ai-report-analysis")
    public ResponseEntity<?> aiReportAnalysis(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body
    ) {
        try {
            User target = service.getById(id);

            AiModerationService.ModerationVerdict verdict = aiModerationService.analyseReport(
                    target.getName() + " " + target.getLastName(),
                    target.getEmail(),
                    target.getReportCount(),
                    body.getOrDefault("category", "other"),
                    body.getOrDefault("reason",   "")
            );

            return ResponseEntity.ok(Map.of(
                    "severity",      verdict.severity(),
                    "action",        verdict.action(),
                    "justification", verdict.justification()
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of("error", "AI analysis failed: " + e.getMessage()));
        }
    }

    // ── FEATURE 2 — AI BIO GENERATOR ─────────────────────────────────────────

    @PostMapping("/{id}/generate-bio")
    public ResponseEntity<?> generateBio(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body
    ) {
        try {
            User user = service.getById(id);

            String bio = aiBioService.generateBio(
                    user.getName(),
                    user.getLastName(),
                    user.getRole() != null ? user.getRole().name() : "FREELANCER",
                    body.getOrDefault("tone",  "professional"),
                    body.getOrDefault("extra", "")
            );

            return ResponseEntity.ok(Map.of("bio", bio));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Bio generation failed: " + e.getMessage()));
        }
    }

    // ── FEATURE 3 — AI SUPPORT CHAT ──────────────────────────────────────────

    @PostMapping("/{id}/support-chat")
    public ResponseEntity<?> supportChat(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body
    ) {
        try {
            String question = body.get("question");
            if (question == null || question.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Question is required"));
            }

            User   user   = service.getById(id);
            String answer = aiSupportService.answer(user, question);

            return ResponseEntity.ok(Map.of("answer", answer));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Support chat failed: " + e.getMessage()));
        }
    }
}

class PasswordChangeRequest {
    private String currentPassword;
    private String newPassword;
    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}