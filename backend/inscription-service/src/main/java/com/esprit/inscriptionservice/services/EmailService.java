package com.esprit.inscriptionservice.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.File;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendAcceptanceEmail(String to, String participantNom, String eventTitle, String badgeImagePath) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject("✅ Inscription acceptée - " + eventTitle);
            String htmlContent = """
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                        <h2 style="color: #4CAF50;">Félicitations, %s !</h2>
                        <p>Votre demande d'inscription à l'événement <strong>%s</strong> a été <strong>acceptée</strong>.</p>
                        <p>Veuillez trouver ci-joint votre badge d'accès.</p>
                        <p>Nous vous souhaitons une excellente expérience !</p>
                    </div>
                    """.formatted(participantNom, eventTitle);
            helper.setText(htmlContent, true);
            if (badgeImagePath != null) {
                FileSystemResource file = new FileSystemResource(new File(badgeImagePath));
                helper.addAttachment("badge_" + eventTitle + ".png", file);
            }
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new MailSendException("Erreur lors de l'envoi de l'email", e);
        }
    }

    public void sendRejectionEmail(String to, String participantNom, String eventTitle) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject("❌ Inscription refusée - " + eventTitle);
            String htmlContent = """
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                        <h2 style="color: #f44336;">Bonjour %s,</h2>
                        <p>Votre demande d'inscription à l'événement <strong>%s</strong> a été <strong>refusée</strong>.</p>
                    </div>
                    """.formatted(participantNom, eventTitle);
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new MailSendException("Erreur lors de l'envoi de l'email", e);
        }
    }
}