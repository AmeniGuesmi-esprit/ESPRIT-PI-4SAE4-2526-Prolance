package com.esprit.microservice.adsservice.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityUtilsTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCurrentUserId_withLongDetails_returnsUserId() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "user@test.com", null, List.of(new SimpleGrantedAuthority("ROLE_FREELANCER")));
        auth.setDetails(42L);
        SecurityContextHolder.getContext().setAuthentication(auth);

        Long userId = SecurityUtils.getCurrentUserId();

        assertThat(userId).isEqualTo(42L);
    }

    @Test
    void getCurrentUserId_withNoAuthentication_returnsNull() {
        SecurityContextHolder.clearContext();

        Long userId = SecurityUtils.getCurrentUserId();

        assertThat(userId).isNull();
    }

    @Test
    void getCurrentUserId_withNonLongDetails_returnsNull() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "user@test.com", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        auth.setDetails("not-a-long");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Long userId = SecurityUtils.getCurrentUserId();

        assertThat(userId).isNull();
    }

    @Test
    void getCurrentUserEmail_withStringPrincipal_returnsEmail() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "admin@test.com", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        String email = SecurityUtils.getCurrentUserEmail();

        assertThat(email).isEqualTo("admin@test.com");
    }

    @Test
    void getCurrentUserEmail_withNoAuthentication_returnsNull() {
        SecurityContextHolder.clearContext();

        String email = SecurityUtils.getCurrentUserEmail();

        assertThat(email).isNull();
    }

    @Test
    void getCurrentUserEmail_withNonStringPrincipal_returnsNull() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                12345, null, List.of(new SimpleGrantedAuthority("ROLE_CLIENT")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        String email = SecurityUtils.getCurrentUserEmail();

        assertThat(email).isNull();
    }
}
