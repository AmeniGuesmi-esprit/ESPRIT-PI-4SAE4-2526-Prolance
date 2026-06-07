package com.esprit.userservice.Services;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.Key;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    // Same secret as the service — must stay in sync
    private static final String SECRET = "super-secret-key-that-is-at-least-32-chars!";
    private final Key verifyKey = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
    }

    // ── generateToken ─────────────────────────────────────────────────────────

    @Test
    void generateToken_shouldReturnNonNullToken() {
        String token = jwtService.generateToken("alice@test.com", "CLIENT");
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void generateToken_shouldContainCorrectSubject() {
        String token = jwtService.generateToken("alice@test.com", "CLIENT");
        Claims claims = parseClaims(token);
        assertEquals("alice@test.com", claims.getSubject());
    }

    @Test
    void generateToken_shouldContainCorrectRole() {
        String token = jwtService.generateToken("alice@test.com", "FREELANCER");
        Claims claims = parseClaims(token);
        assertEquals("FREELANCER", claims.get("role", String.class));
    }

    @Test
    void generateToken_shouldExpireInApproximatelyOneDay() {
        long before = System.currentTimeMillis();
        String token = jwtService.generateToken("alice@test.com", "CLIENT");
        long after = System.currentTimeMillis();

        Claims claims = parseClaims(token);
        long exp = claims.getExpiration().getTime();
        long iat = claims.getIssuedAt().getTime();

        // Expiry should be ≈ 86400000 ms (1 day) after issuance
        long diff = exp - iat;
        assertTrue(diff >= 86399000 && diff <= 86401000,
                "Expected ~86400000 ms validity, got: " + diff);
    }

    @Test
    void generateToken_shouldHaveIssuedAtBeforeExpiration() {
        String token = jwtService.generateToken("alice@test.com", "ADMIN");
        Claims claims = parseClaims(token);
        assertTrue(claims.getIssuedAt().before(claims.getExpiration()));
    }

    @Test
    void generateToken_shouldProduceDifferentTokensForDifferentEmails() {
        String t1 = jwtService.generateToken("alice@test.com", "CLIENT");
        String t2 = jwtService.generateToken("bob@test.com",   "CLIENT");
        assertNotEquals(t1, t2);
    }

    @Test
    void generateToken_shouldProduceDifferentTokensForDifferentRoles() {
        String t1 = jwtService.generateToken("alice@test.com", "CLIENT");
        String t2 = jwtService.generateToken("alice@test.com", "FREELANCER");
        assertNotEquals(t1, t2);
    }

    @Test
    void generateToken_shouldBeSignedWithCorrectKey() {
        String token = jwtService.generateToken("alice@test.com", "CLIENT");
        // If the signature is wrong this will throw
        assertDoesNotThrow(() -> parseClaims(token));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(verifyKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
