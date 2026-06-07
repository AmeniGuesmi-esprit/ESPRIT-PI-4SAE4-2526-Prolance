package com.esprit.userservice.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DtoTest {

    // ── AuthRequest ────────────────────────────────────────────────────────

    @Test
    void authRequest_gettersSetters() {
        AuthRequest r = new AuthRequest("a@b.com", "pass");
        assertThat(r.getEmail()).isEqualTo("a@b.com");
        assertThat(r.getPassword()).isEqualTo("pass");

        r.setEmail("x@y.com");
        r.setPassword("secret");
        assertThat(r.getEmail()).isEqualTo("x@y.com");
        assertThat(r.getPassword()).isEqualTo("secret");
    }

    @Test
    void authRequest_noArgsConstructor() {
        AuthRequest r = new AuthRequest();
        assertThat(r.getEmail()).isNull();
    }

    // ── AuthResponse ───────────────────────────────────────────────────────

    @Test
    void authResponse_allFields() {
        AuthResponse r = new AuthResponse(1, "tok", "ADMIN", "John", "Doe", "avatar.png");
        assertThat(r.getId()).isEqualTo(1);
        assertThat(r.getToken()).isEqualTo("tok");
        assertThat(r.getRole()).isEqualTo("ADMIN");
        assertThat(r.getName()).isEqualTo("John");
        assertThat(r.getLastName()).isEqualTo("Doe");
        assertThat(r.getImageUrl()).isEqualTo("avatar.png");
    }

    @Test
    void authResponse_setters() {
        AuthResponse r = new AuthResponse(1, "t", "r", "n", "l", "i");
        r.setId(2);
        r.setToken("tok2");
        r.setRole("CLIENT");
        r.setName("Jane");
        r.setLastName("Smith");
        r.setImageUrl("img2.png");

        assertThat(r.getId()).isEqualTo(2);
        assertThat(r.getToken()).isEqualTo("tok2");
        assertThat(r.getRole()).isEqualTo("CLIENT");
        assertThat(r.getName()).isEqualTo("Jane");
        assertThat(r.getLastName()).isEqualTo("Smith");
        assertThat(r.getImageUrl()).isEqualTo("img2.png");
    }

    // ── RegisterRequest ────────────────────────────────────────────────────

    @Test
    void registerRequest_gettersSetters() {
        RegisterRequest r = new RegisterRequest();
        r.setName("Alice");
        r.setLastName("Wonder");
        r.setEmail("alice@land.com");
        r.setPassword("p4ss");
        r.setRole("CLIENT");
        r.setBirthDate(LocalDate.of(1995, 6, 15));

        assertThat(r.getName()).isEqualTo("Alice");
        assertThat(r.getLastName()).isEqualTo("Wonder");
        assertThat(r.getEmail()).isEqualTo("alice@land.com");
        assertThat(r.getPassword()).isEqualTo("p4ss");
        assertThat(r.getRole()).isEqualTo("CLIENT");
        assertThat(r.getBirthDate()).isEqualTo(LocalDate.of(1995, 6, 15));
    }

    // ── FaceLoginRequest ───────────────────────────────────────────────────

    @Test
    void faceLoginRequest_gettersSetters() {
        FaceLoginRequest r = new FaceLoginRequest();
        r.setEmail("face@test.com");
        r.setFaceMatchScore(0.95);
        r.setLivenessScore(0.88);
        r.setRole("CLIENT");
        r.setDeviceId("device-001");

        assertThat(r.getEmail()).isEqualTo("face@test.com");
        assertThat(r.getFaceMatchScore()).isEqualTo(0.95);
        assertThat(r.getLivenessScore()).isEqualTo(0.88);
        assertThat(r.getRole()).isEqualTo("CLIENT");
        assertThat(r.getDeviceId()).isEqualTo("device-001");
    }

    // ── FaceAuthMLResponse ─────────────────────────────────────────────────

    @Test
    void faceAuthMLResponse_gettersSetters() {
        FaceAuthMLResponse r = new FaceAuthMLResponse();
        r.setApproved(true);
        r.setConfidence(0.97);
        r.setRiskLevel("LOW");

        assertThat(r.isApproved()).isTrue();
        assertThat(r.getConfidence()).isEqualTo(0.97);
        assertThat(r.getRiskLevel()).isEqualTo("LOW");
    }

    @Test
    void faceAuthMLResponse_notApproved() {
        FaceAuthMLResponse r = new FaceAuthMLResponse();
        r.setApproved(false);
        r.setRiskLevel("HIGH");

        assertThat(r.isApproved()).isFalse();
        assertThat(r.getRiskLevel()).isEqualTo("HIGH");
    }
}
