package com.esprit.userservice.Controllers;

import com.esprit.userservice.Entities.Role;
import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Services.AiBioService;
import com.esprit.userservice.Services.AiModerationService;
import com.esprit.userservice.Services.AiSupportService;
import com.esprit.userservice.Services.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UserControllerTest {

    @Mock UserService userService;
    @Mock AiModerationService aiModerationService;
    @Mock AiBioService aiBioService;
    @Mock AiSupportService aiSupportService;

    UserController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        controller = new UserController(userService, aiModerationService, aiBioService, aiSupportService);
    }

    private User makeUser(int id) {
        User u = new User();
        u.setId(id);
        u.setName("John");
        u.setLastName("Doe");
        u.setEmail("john@test.com");
        u.setRole(Role.CLIENT);
        u.setEnabled(true);
        return u;
    }

    // ── getUser ────────────────────────────────────────────────────────────

    @Test
    void getUser_found_returns200() {
        when(userService.getById(1)).thenReturn(makeUser(1));

        ResponseEntity<?> resp = controller.getUser(1);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void getUser_throws_returns500() {
        when(userService.getById(99)).thenThrow(new RuntimeException("not found"));

        ResponseEntity<?> resp = controller.getUser(99);

        assertThat(resp.getStatusCodeValue()).isEqualTo(500);
    }

    // ── getUserEmail ───────────────────────────────────────────────────────

    @Test
    void getUserEmail_returnsEmail() {
        when(userService.getById(1)).thenReturn(makeUser(1));

        ResponseEntity<String> resp = controller.getUserEmail(1);

        assertThat(resp.getBody()).isEqualTo("john@test.com");
    }

    // ── updateUser ─────────────────────────────────────────────────────────

    @Test
    void updateUser_normalUpdate_callsUpdateUser() {
        User existing = makeUser(1);
        User details = new User();
        details.setName("Jane");
        details.setEnabled(true);
        when(userService.getById(1)).thenReturn(existing);
        when(userService.updateUser(eq(1), any())).thenReturn(existing);

        ResponseEntity<?> resp = controller.updateUser(1, details);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
        verify(userService).updateUser(eq(1), any());
    }

    @Test
    void updateUser_applyTimeout_callsApplyTimeout() {
        User existing = makeUser(1);
        existing.setTimedOut(false);
        User details = new User();
        details.setTimedOut(true);
        details.setTimeoutUntil(LocalDateTime.now().plusHours(1));

        when(userService.getById(1)).thenReturn(existing);
        when(userService.applyTimeout(eq(1), any())).thenReturn(existing);

        ResponseEntity<?> resp = controller.updateUser(1, details);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
        verify(userService).applyTimeout(eq(1), any());
    }

    @Test
    void updateUser_liftTimeout_callsLiftTimeout() {
        User existing = makeUser(1);
        existing.setTimedOut(true);
        User details = new User();
        details.setTimedOut(false);
        details.setEnabled(true);

        when(userService.getById(1)).thenReturn(existing);
        when(userService.getById(1)).thenReturn(existing); // called twice
        doNothing().when(userService).liftTimeout(1);

        ResponseEntity<?> resp = controller.updateUser(1, details);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void updateUser_deactivate_callsDeactivate() {
        User existing = makeUser(1);
        existing.setEnabled(true);
        User details = new User();
        details.setEnabled(false);

        when(userService.getById(1)).thenReturn(existing);
        doNothing().when(userService).deactivate(1);

        ResponseEntity<?> resp = controller.updateUser(1, details);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void updateUser_reactivate_callsReactivate() {
        User existing = makeUser(1);
        existing.setEnabled(false);
        User details = new User();
        details.setEnabled(true);

        when(userService.getById(1)).thenReturn(existing);
        doNothing().when(userService).reactivate(1);

        ResponseEntity<?> resp = controller.updateUser(1, details);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void updateUser_throws_returns400() {
        when(userService.getById(1)).thenThrow(new RuntimeException("oops"));

        ResponseEntity<?> resp = controller.updateUser(1, new User());

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── updateAvatar ───────────────────────────────────────────────────────

    @Test
    void updateAvatar_returnsUpdatedUser() {
        User user = makeUser(1);
        when(userService.updateAvatar(1, "url")).thenReturn(user);

        ResponseEntity<User> resp = controller.updateAvatar(1, Map.of("avatar", "url"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    // ── updateBio ──────────────────────────────────────────────────────────

    @Test
    void updateBio_valid_returns200() {
        User user = makeUser(1);
        user.setBio("new bio");
        when(userService.updateBio(1, "new bio")).thenReturn(user);

        ResponseEntity<?> resp = controller.updateBio(1, Map.of("bio", "new bio"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void updateBio_missingBio_returns400() {
        ResponseEntity<?> resp = controller.updateBio(1, Map.of());

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    @Test
    void updateBio_serviceThrows_returns500() {
        when(userService.updateBio(1, "bio")).thenThrow(new RuntimeException("fail"));

        ResponseEntity<?> resp = controller.updateBio(1, Map.of("bio", "bio"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(500);
    }

    // ── changePassword ─────────────────────────────────────────────────────

    @Test
    void changePassword_success_returns200() {
        doNothing().when(userService).changePassword(1, "old", "new");

        ResponseEntity<?> resp = controller.changePassword(1,
                buildPasswordRequest("old", "new"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void changePassword_throws_returns400() {
        doThrow(new RuntimeException("wrong")).when(userService).changePassword(1, "bad", "x");

        ResponseEntity<?> resp = controller.changePassword(1,
                buildPasswordRequest("bad", "x"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── deleteUser ─────────────────────────────────────────────────────────

    @Test
    void deleteUser_success_returns200() {
        doNothing().when(userService).deleteUser(1);

        ResponseEntity<?> resp = controller.deleteUser(1);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void deleteUser_throws_returns400() {
        doThrow(new RuntimeException("not found")).when(userService).deleteUser(99);

        ResponseEntity<?> resp = controller.deleteUser(99);

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── deactivate ─────────────────────────────────────────────────────────

    @Test
    void deactivate_success_returns200() {
        doNothing().when(userService).deactivate(1);
        ResponseEntity<?> resp = controller.deactivate(1);
        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void deactivate_throws_returns400() {
        doThrow(new RuntimeException("x")).when(userService).deactivate(1);
        ResponseEntity<?> resp = controller.deactivate(1);
        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── searchUsers ────────────────────────────────────────────────────────

    @Test
    void searchUsers_returnsProjectedList() {
        User u = makeUser(1);
        when(userService.searchByName("jo")).thenReturn(List.of(u));

        List<Map<String, Object>> result = controller.searchUsers("jo");

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).containsKey("id");
    }

    // ── getAllUsers ────────────────────────────────────────────────────────

    @Test
    void getAllUsers_returnsList() {
        when(userService.getAll()).thenReturn(List.of(makeUser(1), makeUser(2)));

        List<Map<String, Object>> result = controller.getAllUsers();

        assertThat(result).hasSize(2);
    }

    // ── reportUser ─────────────────────────────────────────────────────────

    @Test
    void reportUser_success_returns200() {
        User u = makeUser(1);
        u.setReportCount(1);
        when(userService.reportUser(1)).thenReturn(u);

        ResponseEntity<?> resp = controller.reportUser(1);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void reportUser_autoDeactivated_messageReflects() {
        User u = makeUser(1);
        u.setReportCount(3);
        u.setEnabled(false);
        when(userService.reportUser(1)).thenReturn(u);

        ResponseEntity<?> resp = controller.reportUser(1);

        assertThat(resp.getBody().toString()).contains("auto-deactivated");
    }

    @Test
    void reportUser_throws_returns400() {
        when(userService.reportUser(1)).thenThrow(new RuntimeException("fail"));

        ResponseEntity<?> resp = controller.reportUser(1);

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── timeoutUser ────────────────────────────────────────────────────────

    @Test
    void timeoutUser_success_returns200() {
        User u = makeUser(1);
        u.setTimedOut(true);
        u.setTimeoutUntil(LocalDateTime.now().plusHours(1));
        when(userService.applyTimeout(eq(1), any())).thenReturn(u);

        ResponseEntity<?> resp = controller.timeoutUser(1,
                Map.of("until", LocalDateTime.now().plusHours(1).toString()));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void timeoutUser_invalidDate_returns400() {
        ResponseEntity<?> resp = controller.timeoutUser(1, Map.of("until", "not-a-date"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── liftTimeout ────────────────────────────────────────────────────────

    @Test
    void liftTimeout_success_returns200() {
        doNothing().when(userService).liftTimeout(1);

        ResponseEntity<?> resp = controller.liftTimeout(1);

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void liftTimeout_throws_returns400() {
        doThrow(new RuntimeException("x")).when(userService).liftTimeout(1);

        ResponseEntity<?> resp = controller.liftTimeout(1);

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    // ── aiReportAnalysis ───────────────────────────────────────────────────

    @Test
    void aiReportAnalysis_success_returns200() throws Exception {
        User u = makeUser(1);
        AiModerationService.ModerationVerdict verdict =
                new AiModerationService.ModerationVerdict("HIGH", "SUSPEND", "spam");
        when(userService.getById(1)).thenReturn(u);
        when(aiModerationService.analyseReport(any(), any(), anyInt(), any(), any()))
                .thenReturn(verdict);

        ResponseEntity<?> resp = controller.aiReportAnalysis(1, Map.of("category", "spam", "reason", "test"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void aiReportAnalysis_throws_returns500() {
        when(userService.getById(1)).thenThrow(new RuntimeException("fail"));

        ResponseEntity<?> resp = controller.aiReportAnalysis(1, Map.of());

        assertThat(resp.getStatusCodeValue()).isEqualTo(500);
    }

    // ── generateBio ────────────────────────────────────────────────────────

    @Test
    void generateBio_success_returns200() throws Exception {
        User u = makeUser(1);
        when(userService.getById(1)).thenReturn(u);
        when(aiBioService.generateBio(any(), any(), any(), any(), any())).thenReturn("A great bio");

        ResponseEntity<?> resp = controller.generateBio(1, Map.of("tone", "professional", "extra", ""));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void generateBio_throws_returns500() {
        when(userService.getById(1)).thenThrow(new RuntimeException("fail"));

        ResponseEntity<?> resp = controller.generateBio(1, Map.of());

        assertThat(resp.getStatusCodeValue()).isEqualTo(500);
    }

    // ── supportChat ────────────────────────────────────────────────────────

    @Test
    void supportChat_missingQuestion_returns400() {
        ResponseEntity<?> resp = controller.supportChat(1, Map.of());

        assertThat(resp.getStatusCodeValue()).isEqualTo(400);
    }

    @Test
    void supportChat_success_returns200() throws Exception {
        User u = makeUser(1);
        when(userService.getById(1)).thenReturn(u);
        when(aiSupportService.answer(eq(u), any())).thenReturn("Here is the answer");

        ResponseEntity<?> resp = controller.supportChat(1, Map.of("question", "How do I reset?"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(200);
    }

    @Test
    void supportChat_throws_returns500() {
        when(userService.getById(1)).thenThrow(new RuntimeException("fail"));

        ResponseEntity<?> resp = controller.supportChat(1, Map.of("question", "x"));

        assertThat(resp.getStatusCodeValue()).isEqualTo(500);
    }

    // ── helper ─────────────────────────────────────────────────────────────

    private PasswordChangeRequest buildPasswordRequest(String current, String newPwd) {
        PasswordChangeRequest r = new PasswordChangeRequest();
        r.setCurrentPassword(current);
        r.setNewPassword(newPwd);
        return r;
    }
}
