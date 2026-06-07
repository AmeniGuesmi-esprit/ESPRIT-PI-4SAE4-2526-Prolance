package com.esprit.userservice.Controllers;

import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.UserRepository;
import com.esprit.userservice.dto.AuthRequest;
import com.esprit.userservice.dto.AuthResponse;
import com.esprit.userservice.dto.FaceLoginRequest;
import com.esprit.userservice.dto.FaceAuthMLResponse;
import com.esprit.userservice.dto.RegisterRequest;
import com.esprit.userservice.Services.AuthService;
import com.esprit.userservice.Services.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication API", description = "Register and login users")
public class AuthController {

    private final AuthService    authService;
    private final UserRepository userRepository;
    private final JwtService     jwtService;
    private final ObjectMapper   objectMapper = new ObjectMapper();

    public AuthController(AuthService authService,
                          UserRepository userRepository,
                          JwtService jwtService) {
        this.authService    = authService;
        this.userRepository = userRepository;
        this.jwtService     = jwtService;
    }

    @Operation(summary = "Login a user")
    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest request) {
        return authService.login(request);
    }

    @Operation(summary = "Register a new user")
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(Map.of("message", "Registration successful! Please check your email to verify your account."));
    }

    // ── Face login — validated by ML model before issuing JWT ────────────────
    @Operation(summary = "Login via face recognition")
    @PostMapping("/face-login")
    public ResponseEntity<?> faceLogin(@RequestBody FaceLoginRequest req) {

        if (req.getEmail() == null || req.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        FaceAuthMLResponse mlResult;
        Path tempFile  = null;
        Path batchFile = null;

        try {
            String inputJson = String.format(
                    "{\"face_match_score\":%.4f,\"liveness_score\":%.4f,\"role\":\"%s\",\"device_id\":\"%s\"}",
                    req.getFaceMatchScore(),
                    req.getLivenessScore(),
                    req.getRole()     != null ? req.getRole()     : "USER",
                    req.getDeviceId() != null ? req.getDeviceId() : "unknown"
            );

            tempFile = Files.createTempFile("face_input_", ".json");
            Files.writeString(tempFile, inputJson);

            // ── Absolute path to avoid Windows spaces issue ──
            String scriptPath = System.getProperty("user.dir") + "\\src\\main\\ml\\predict.py";

            System.out.println("📁 Working dir: " + System.getProperty("user.dir"));
            System.out.println("🐍 Script path: " + scriptPath);
            System.out.println("🐍 Temp file:   " + tempFile);
            System.out.println("🐍 Input JSON:  " + inputJson);

            // ── Write batch file to handle Windows path/quoting ──
            batchFile = Files.createTempFile("run_face_", ".bat");
            Files.writeString(batchFile,
                    "@echo off\r\npython \"" + scriptPath + "\" \"" + tempFile.toString() + "\"\r\n"
            );

            ProcessBuilder pb = new ProcessBuilder("cmd", "/c", batchFile.toString());
            pb.redirectErrorStream(false);

            Process process = pb.start();

            // ── Read BOTH stdout and stderr ──
            String stdout = new String(process.getInputStream().readAllBytes()).trim();
            String stderr = new String(process.getErrorStream().readAllBytes()).trim();
            int    exitCode = process.waitFor();

            System.out.println("🐍 Exit code: " + exitCode);
            System.out.println("🐍 Stdout:    " + stdout);
            System.out.println("🐍 Stderr:    " + stderr);

            // ── Search both streams for JSON line ──
            String combined = stdout + "\n" + stderr;
            String jsonLine = combined.lines()
                    .map(String::trim)
                    .filter(l -> l.startsWith("{") && l.endsWith("}"))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException(
                            "No JSON found in Python output. stdout=" + stdout + " stderr=" + stderr
                    ));

            mlResult = objectMapper.readValue(jsonLine, FaceAuthMLResponse.class);

        } catch (Exception e) {
            System.out.println("❌ ML error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(503)
                    .body(Map.of("error", "ml-script-failed", "detail", e.getMessage()));
        } finally {
            if (tempFile  != null) try { Files.deleteIfExists(tempFile);  } catch (Exception ignored) {}
            if (batchFile != null) try { Files.deleteIfExists(batchFile); } catch (Exception ignored) {}
        }

        // ── ML rejected ──
        if (!mlResult.isApproved()) {
            return ResponseEntity.status(401)
                    .body(Map.of(
                            "error",      "face-auth-rejected",
                            "confidence", mlResult.getConfidence(),
                            "risk",       mlResult.getRiskLevel()
                    ));
        }

        // ── Approved — find user and issue JWT ──
        User user = userRepository.findByEmail(req.getEmail()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());

        System.out.println("✅ Face login success for: " + user.getEmail());

        return ResponseEntity.ok(Map.of(
                "id",       user.getId(),
                "email",    user.getEmail(),
                "name",     user.getName(),
                "lastName", user.getLastName(),
                "role",     user.getRole().name(),
                "token",    token
        ));
    }

    // ── Verify email ──────────────────────────────────────────────────────────
    @GetMapping("/verify-email")
    public void verifyEmail(@RequestParam String token, HttpServletResponse response) throws IOException {
        try {
            authService.verifyEmail(token);
            response.sendRedirect("http://localhost:4200/#/login?verified=true");
        } catch (Exception e) {
            response.sendRedirect("http://localhost:4200/#/login?verified=false&reason=" + e.getMessage());
        }
    }

    // ── Resend verification email ─────────────────────────────────────────────
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        try {
            authService.resendVerification(email);
            return ResponseEntity.ok(Map.of("message", "Verification email sent!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @Operation(summary = "Get all registered users")
    @GetMapping("/users")
    public List<User> getAllUsers() {
        return authService.getAllUsers();
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Integer id) {
        userRepository.deleteById(id);
    }
}