package com.esprit.userservice.Entities;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class EntityTest {

    // ── User ───────────────────────────────────────────────────────────────

    @Test
    void user_defaultValues() {
        User u = new User();
        assertThat(u.isEnabled()).isTrue();
        assertThat(u.isEmailVerified()).isFalse();
        assertThat(u.isTimedOut()).isFalse();
        assertThat(u.getReportCount()).isEqualTo(0);
    }

    @Test
    void user_allArgsConstructorAndGetters() {
        LocalDateTime timeout = LocalDateTime.now().plusDays(1);
        User u = new User(1, "John", "Doe", LocalDate.of(2000, 1, 1),
                "j@d.com", "hash", Role.ADMIN,
                true, true, "avatar.png", "A bio",
                false, null, 2);

        assertThat(u.getId()).isEqualTo(1);
        assertThat(u.getName()).isEqualTo("John");
        assertThat(u.getLastName()).isEqualTo("Doe");
        assertThat(u.getEmail()).isEqualTo("j@d.com");
        assertThat(u.getPassword()).isEqualTo("hash");
        assertThat(u.getRole()).isEqualTo(Role.ADMIN);
        assertThat(u.isEnabled()).isTrue();
        assertThat(u.isEmailVerified()).isTrue();
        assertThat(u.getAvatar()).isEqualTo("avatar.png");
        assertThat(u.getBio()).isEqualTo("A bio");
        assertThat(u.getReportCount()).isEqualTo(2);
    }

    @Test
    void user_settersWork() {
        User u = new User();
        u.setName("Alice");
        u.setLastName("Smith");
        u.setEmail("alice@smith.com");
        u.setPassword("hashed");
        u.setRole(Role.CLIENT);
        u.setEnabled(false);
        u.setEmailVerified(true);
        u.setAvatar("url");
        u.setBio("bio text");
        u.setTimedOut(true);
        u.setTimeoutUntil(LocalDateTime.of(2025, 1, 1, 0, 0));
        u.setReportCount(3);
        u.setBirthDate(LocalDate.of(1990, 5, 20));

        assertThat(u.getName()).isEqualTo("Alice");
        assertThat(u.getLastName()).isEqualTo("Smith");
        assertThat(u.getEmail()).isEqualTo("alice@smith.com");
        assertThat(u.getPassword()).isEqualTo("hashed");
        assertThat(u.getRole()).isEqualTo(Role.CLIENT);
        assertThat(u.isEnabled()).isFalse();
        assertThat(u.isEmailVerified()).isTrue();
        assertThat(u.getAvatar()).isEqualTo("url");
        assertThat(u.getBio()).isEqualTo("bio text");
        assertThat(u.isTimedOut()).isTrue();
        assertThat(u.getTimeoutUntil()).isEqualTo(LocalDateTime.of(2025, 1, 1, 0, 0));
        assertThat(u.getReportCount()).isEqualTo(3);
        assertThat(u.getBirthDate()).isEqualTo(LocalDate.of(1990, 5, 20));
    }

    // ── Role ───────────────────────────────────────────────────────────────

    @Test
    void role_values_exist() {
        assertThat(Role.values()).contains(Role.ADMIN, Role.CLIENT, Role.FREELANCER);
    }

    @Test
    void role_valueOf() {
        assertThat(Role.valueOf("ADMIN")).isEqualTo(Role.ADMIN);
        assertThat(Role.valueOf("CLIENT")).isEqualTo(Role.CLIENT);
        assertThat(Role.valueOf("FREELANCER")).isEqualTo(Role.FREELANCER);
    }

    // ── EmailVerificationToken ─────────────────────────────────────────────

    @Test
    void emailVerificationToken_gettersSetters() {
        EmailVerificationToken t = new EmailVerificationToken();
        User u = new User();
        u.setEmail("v@test.com");
        t.setUser(u);
        t.setToken("abc123");
        t.setExpiresAt(LocalDateTime.of(2026, 1, 1, 0, 0));

        assertThat(t.getUser().getEmail()).isEqualTo("v@test.com");
        assertThat(t.getToken()).isEqualTo("abc123");
        assertThat(t.getExpiresAt()).isEqualTo(LocalDateTime.of(2026, 1, 1, 0, 0));
    }

    @Test
    void emailVerificationToken_isExpired_whenPast() {
        EmailVerificationToken t = new EmailVerificationToken();
        t.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        assertThat(t.isExpired()).isTrue();
    }

    @Test
    void emailVerificationToken_notExpired_whenFuture() {
        EmailVerificationToken t = new EmailVerificationToken("tok", new User());
        assertThat(t.isExpired()).isFalse();
    }

    // ── PasswordResetToken ─────────────────────────────────────────────────

    @Test
    void passwordResetToken_gettersSetters() {
        PasswordResetToken t = new PasswordResetToken();
        User u = new User();
        u.setEmail("reset@test.com");
        t.setUser(u);
        t.setToken("reset-tok");
        t.setExpiresAt(LocalDateTime.of(2026, 6, 1, 12, 0));

        assertThat(t.getUser().getEmail()).isEqualTo("reset@test.com");
        assertThat(t.getToken()).isEqualTo("reset-tok");
        assertThat(t.getExpiresAt()).isEqualTo(LocalDateTime.of(2026, 6, 1, 12, 0));
    }

    @Test
    void passwordResetToken_isExpired_whenPast() {
        PasswordResetToken t = new PasswordResetToken();
        t.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        assertThat(t.isExpired()).isTrue();
    }

    @Test
    void passwordResetToken_notExpired_whenFuture() {
        PasswordResetToken t = new PasswordResetToken("tok", new User());
        assertThat(t.isExpired()).isFalse();
    }
}
