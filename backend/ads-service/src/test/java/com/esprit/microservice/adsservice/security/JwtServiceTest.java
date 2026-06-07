package com.esprit.microservice.adsservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String SECRET = "super-secret-key-that-is-at-least-32-chars!";
    private JwtService jwtService;
    private Key key;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET);
        key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    private String generateToken(String email, String role, Integer id, long expirationMillis) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .claim("id", id)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMillis))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    @Test
    void extractEmail_returnsCorrectEmail() {
        String token = generateToken("user@test.com", "FREELANCER", 42, 3600000);

        String email = jwtService.extractEmail(token);

        assertThat(email).isEqualTo("user@test.com");
    }

    @Test
    void extractRole_returnsCorrectRole() {
        String token = generateToken("user@test.com", "ADMIN", 1, 3600000);

        String role = jwtService.extractRole(token);

        assertThat(role).isEqualTo("ADMIN");
    }

    @Test
    void extractId_returnsCorrectId() {
        String token = generateToken("user@test.com", "CLIENT", 99, 3600000);

        Long id = jwtService.extractId(token);

        assertThat(id).isEqualTo(99L);
    }

    @Test
    void extractId_nullId_returnsNull() {
        String token = Jwts.builder()
                .setSubject("user@test.com")
                .claim("role", "ADMIN")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        Long id = jwtService.extractId(token);

        assertThat(id).isNull();
    }

    @Test
    void isTokenValid_validToken_returnsTrue() {
        String token = generateToken("user@test.com", "FREELANCER", 1, 3600000);

        boolean valid = jwtService.isTokenValid(token);

        assertThat(valid).isTrue();
    }

    @Test
    void isTokenValid_expiredToken_returnsFalse() {
        String token = generateToken("user@test.com", "FREELANCER", 1, -1000);

        boolean valid = jwtService.isTokenValid(token);

        assertThat(valid).isFalse();
    }

    @Test
    void isTokenValid_malformedToken_returnsFalse() {
        boolean valid = jwtService.isTokenValid("not.a.valid.token");

        assertThat(valid).isFalse();
    }

    @Test
    void extractAllClaims_returnsAllClaims() {
        String token = generateToken("admin@test.com", "ADMIN", 5, 3600000);

        Claims claims = jwtService.extractAllClaims(token);

        assertThat(claims.getSubject()).isEqualTo("admin@test.com");
        assertThat(claims.get("role", String.class)).isEqualTo("ADMIN");
        assertThat(claims.get("id", Integer.class)).isEqualTo(5);
    }
}
