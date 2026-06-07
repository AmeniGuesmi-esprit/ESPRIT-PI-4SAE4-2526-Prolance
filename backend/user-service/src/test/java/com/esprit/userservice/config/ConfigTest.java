package com.esprit.userservice.config;

import com.esprit.userservice.Entities.Role;
import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.UserRepository;
import com.esprit.userservice.Services.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ConfigTest {

    // ── AppConfig ─────────────────────────────────────────────────────────────

    @Test
    void appConfig_passwordEncoderBean_isBCrypt() {
        AppConfig config = new AppConfig();
        PasswordEncoder encoder = config.passwordEncoder();

        assertThat(encoder).isInstanceOf(BCryptPasswordEncoder.class);
        assertThat(encoder.matches("secret", encoder.encode("secret"))).isTrue();
    }

    // ── JwtAuthFilter ─────────────────────────────────────────────────────────

    @Mock UserRepository userRepository;
    @Mock FilterChain filterChain;
    @Mock HttpServletRequest request;
    @Mock HttpServletResponse response;

    JwtAuthFilter jwtAuthFilter;
    JwtService jwtService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        jwtAuthFilter = new JwtAuthFilter(userRepository);
        jwtService = new JwtService();
        SecurityContextHolder.clearContext();
    }

    @Test
    void jwtFilter_noAuthHeader_passesThrough() throws Exception {
        when(request.getMethod()).thenReturn("GET");
        when(request.getHeader("Authorization")).thenReturn(null);
        when(request.getRequestURI()).thenReturn("/api/test");

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void jwtFilter_optionsMethod_passesThrough() throws Exception {
        when(request.getMethod()).thenReturn("OPTIONS");

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void jwtFilter_invalidToken_passesThrough() throws Exception {
        when(request.getMethod()).thenReturn("GET");
        when(request.getHeader("Authorization")).thenReturn("Bearer invalid.token.here");
        when(request.getRequestURI()).thenReturn("/api/test");

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void jwtFilter_validToken_setsAuthentication() throws Exception {
        String token = jwtService.generateToken("user@test.com", "CLIENT");

        when(request.getMethod()).thenReturn("GET");
        when(request.getHeader("Authorization")).thenReturn("Bearer " + token);
        when(request.getRequestURI()).thenReturn("/users/1");

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName())
                .isEqualTo("user@test.com");
    }

    @Test
    void jwtFilter_missingBearerPrefix_passesThrough() throws Exception {
        when(request.getMethod()).thenReturn("GET");
        when(request.getHeader("Authorization")).thenReturn("Basic dXNlcjpwYXNz");
        when(request.getRequestURI()).thenReturn("/api/test");

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    // ── OAuth2SuccessHandler ──────────────────────────────────────────────────

    @Test
    void oauth2Handler_existingUser_doesNotSave() throws Exception {
        JwtService jwtSvc = mock(JwtService.class);
        UserRepository repo = mock(UserRepository.class);
        OAuth2SuccessHandler handler = new OAuth2SuccessHandler(repo, jwtSvc);

        User existing = new User();
        existing.setId(1);
        existing.setEmail("o@google.com");
        existing.setRole(Role.CLIENT);
        existing.setName("Google");
        existing.setLastName("User");

        org.springframework.security.oauth2.core.user.OAuth2User oAuth2User =
                mock(org.springframework.security.oauth2.core.user.OAuth2User.class);
        when(oAuth2User.getAttribute("email")).thenReturn("o@google.com");
        when(oAuth2User.getAttribute("given_name")).thenReturn("Google");
        when(oAuth2User.getAttribute("family_name")).thenReturn("User");

        org.springframework.security.core.Authentication auth =
                mock(org.springframework.security.core.Authentication.class);
        when(auth.getPrincipal()).thenReturn(oAuth2User);

        when(repo.findByEmail("o@google.com")).thenReturn(Optional.of(existing));
        when(jwtSvc.generateToken("o@google.com", "CLIENT")).thenReturn("jwt123");

        HttpServletResponse httpResp = mock(HttpServletResponse.class);
        java.io.PrintWriter writer = mock(java.io.PrintWriter.class);
        when(httpResp.getWriter()).thenReturn(writer);

        handler.onAuthenticationSuccess(mock(HttpServletRequest.class), httpResp, auth);

        verify(repo, never()).save(any());
        verify(writer).write(contains("jwt123"));
    }

    @Test
    void oauth2Handler_newUser_savesAndResponds() throws Exception {
        JwtService jwtSvc = mock(JwtService.class);
        UserRepository repo = mock(UserRepository.class);
        OAuth2SuccessHandler handler = new OAuth2SuccessHandler(repo, jwtSvc);

        User saved = new User();
        saved.setId(2);
        saved.setEmail("new@google.com");
        saved.setRole(Role.CLIENT);
        saved.setName("New");
        saved.setLastName("Person");

        org.springframework.security.oauth2.core.user.OAuth2User oAuth2User =
                mock(org.springframework.security.oauth2.core.user.OAuth2User.class);
        when(oAuth2User.getAttribute("email")).thenReturn("new@google.com");
        when(oAuth2User.getAttribute("given_name")).thenReturn("New");
        when(oAuth2User.getAttribute("family_name")).thenReturn("Person");

        org.springframework.security.core.Authentication auth =
                mock(org.springframework.security.core.Authentication.class);
        when(auth.getPrincipal()).thenReturn(oAuth2User);

        when(repo.findByEmail("new@google.com")).thenReturn(Optional.empty());
        when(repo.save(any(User.class))).thenReturn(saved);
        when(jwtSvc.generateToken("new@google.com", "CLIENT")).thenReturn("newtoken");

        HttpServletResponse httpResp = mock(HttpServletResponse.class);
        java.io.PrintWriter writer = mock(java.io.PrintWriter.class);
        when(httpResp.getWriter()).thenReturn(writer);

        handler.onAuthenticationSuccess(mock(HttpServletRequest.class), httpResp, auth);

        verify(repo).save(any(User.class));
    }
}
