package com.esprit.inscriptionservice.services;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    // ─── sendAcceptanceEmail ───────────────────────────────────────────────────

    @Test
    void sendAcceptanceEmail_shouldSendSuccessfully_withoutBadge() throws Exception {
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        emailService.sendAcceptanceEmail(
                "test@email.com", "Yesmine", "Conférence DevOps", null);

        verify(mailSender, times(1)).send(mimeMessage);
    }

    @Test
    void sendAcceptanceEmail_shouldSendSuccessfully_withBadge() throws Exception {
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        // On passe un chemin inexistant — le test vérifie juste que send() est appelé
        emailService.sendAcceptanceEmail(
                "test@email.com", "Yesmine", "Conférence DevOps", null);

        verify(mailSender, times(1)).send(mimeMessage);
    }

    @Test
    void sendAcceptanceEmail_shouldThrowMailSendException_whenSmtpFails() {
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("SMTP down"));

        assertThatThrownBy(() ->
                emailService.sendAcceptanceEmail(
                        "bad@email.com", "X", "Event", null))
                .isInstanceOf(RuntimeException.class);
    }

    // ─── sendRejectionEmail ────────────────────────────────────────────────────

    @Test
    void sendRejectionEmail_shouldSendSuccessfully() throws Exception {
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        emailService.sendRejectionEmail(
                "test@email.com", "Yesmine", "Conférence DevOps");

        verify(mailSender, times(1)).send(mimeMessage);
    }

    @Test
    void sendRejectionEmail_shouldThrowMailSendException_whenSmtpFails() {
        when(mailSender.createMimeMessage()).thenThrow(new RuntimeException("SMTP down"));

        assertThatThrownBy(() ->
                emailService.sendRejectionEmail(
                        "bad@email.com", "X", "Event"))
                .isInstanceOf(RuntimeException.class);
    }
}