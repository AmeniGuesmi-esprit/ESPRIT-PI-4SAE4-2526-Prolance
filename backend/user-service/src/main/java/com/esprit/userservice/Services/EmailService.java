package com.esprit.userservice.Services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ── Shared CSS injected into every email ──────────────────────────────────
    private static final String BASE_STYLES = """
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Poppins', 'Segoe UI', sans-serif;
            background: #f4f0fb;
            margin: 0; padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .email-outer {
            background: #f4f0fb;
            padding: 40px 16px 48px;
          }
          /* Card */
          .wrapper {
            max-width: 520px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 24px 64px rgba(0,0,0,0.10), 0 4px 16px rgba(156,39,176,0.06);
          }
          /* Header */
          .header {
            background: linear-gradient(135deg, #9c27b0 0%, #7c3aed 50%, #4f46e5 100%);
            padding: 40px 36px 36px;
            text-align: center;
          }
          .header-logo {
            display: inline-block;
            font-size: 11px;
            font-weight: 800;
            color: rgba(255,255,255,0.65);
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 14px;
          }
          .header-icon {
            font-size: 38px;
            line-height: 1;
            margin-bottom: 12px;
            display: block;
          }
          .header h1 {
            color: #ffffff;
            margin: 0 0 6px;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.3px;
          }
          .header p {
            color: rgba(255,255,255,0.72);
            margin: 0;
            font-size: 13px;
            font-weight: 500;
          }
          /* Body */
          .body {
            padding: 36px 36px 28px;
          }
          .body p {
            color: #555e6e;
            font-size: 14px;
            line-height: 1.75;
            margin: 0 0 14px;
            font-weight: 500;
          }
          .body p:last-child { margin-bottom: 0; }
          /* CTA Button */
          .btn-wrap { text-align: center; margin: 28px 0; }
          .btn {
            display: inline-block;
            padding: 14px 44px;
            background: linear-gradient(135deg, #9c27b0, #7b1fa2);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.2px;
            box-shadow: 0 4px 18px rgba(156,39,176,0.40);
          }
          /* Divider */
          .divider { height: 1px; background: #f0eef8; margin: 24px 0; }
          /* Notice pills */
          .notice {
            background: linear-gradient(135deg, #fdf4ff, #f8f9fe);
            border: 1.5px solid #f0eef8;
            border-radius: 12px;
            padding: 12px 16px;
            margin-top: 10px;
            font-size: 12px;
            color: #888;
            font-weight: 500;
            line-height: 1.65;
          }
          .notice strong { color: #555e6e; font-weight: 700; }
          /* Link fallback */
          .link-fallback {
            display: inline-block;
            margin-top: 4px;
            word-break: break-all;
            color: #9c27b0;
            font-size: 12px;
            font-weight: 600;
          }
          /* Footer */
          .footer {
            background: #f4f0fb;
            border-top: 1px solid #f0eef8;
            padding: 20px 36px;
            text-align: center;
            font-size: 11px;
            color: #bbb;
            font-weight: 500;
            line-height: 1.6;
          }
          .footer a { color: #9c27b0; text-decoration: none; font-weight: 600; }
        </style>
        """;

    // ── Password Reset Email ──────────────────────────────────────────────────
    public void sendPasswordResetEmail(String toEmail, String resetToken) throws MessagingException {
        String resetLink = "http://localhost:4200/#/reset-password?token=" + resetToken;
        int year = java.time.Year.now().getValue();

        String html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              %s
            </head>
            <body>
              <div class="email-outer">
                <div class="wrapper">

                  <div class="header">
                    <span class="header-logo">Prolance</span>
                    <span class="header-icon">🔐</span>
                    <h1>Password Reset</h1>
                    <p>We received a request to reset your password</p>
                  </div>

                  <div class="body">
                    <p>Hi there,</p>
                    <p>
                      Click the button below to choose a new password for your Prolance account.
                      This link is only valid for <strong style="color:#2d1f4e;">30 minutes</strong>.
                    </p>

                    <div class="btn-wrap">
                      <a href="%s" class="btn">Reset My Password</a>
                    </div>

                    <div class="divider"></div>

                    <div class="notice">
                      ⏰&nbsp; This link expires in <strong>30 minutes</strong>.
                      If you didn't request a reset, you can safely ignore this email.
                    </div>

                    <div class="notice">
                      🔗&nbsp; Or paste this link in your browser:<br>
                      <span class="link-fallback">%s</span>
                    </div>
                  </div>

                  <div class="footer">
                    &copy; %d Prolance &nbsp;&middot;&nbsp;
                    <a href="#">Privacy Policy</a> &nbsp;&middot;&nbsp;
                    <a href="#">Help</a>
                  </div>

                </div>
              </div>
            </body>
            </html>
            """.formatted(BASE_STYLES, resetLink, resetLink, year);

        sendHtmlEmail(toEmail, "Reset your Prolance password", html);
    }

    // ── Email Verification Email ──────────────────────────────────────────────
    public void sendVerificationEmail(String toEmail, String verificationToken) throws MessagingException {
        String verifyLink = "http://localhost:8081/api/auth/verify-email?token=" + verificationToken;
        int year = java.time.Year.now().getValue();

        String html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              %s
            </head>
            <body>
              <div class="email-outer">
                <div class="wrapper">

                  <div class="header">
                    <span class="header-logo">Prolance</span>
                    <span class="header-icon">✉️</span>
                    <h1>Verify Your Email</h1>
                    <p>One last step to activate your account</p>
                  </div>

                  <div class="body">
                    <p>Welcome to Prolance! 🎉</p>
                    <p>
                      You're almost there. Click below to verify your email address
                      and unlock your full account access.
                    </p>

                    <div class="btn-wrap">
                      <a href="%s" class="btn">Verify My Email</a>
                    </div>

                    <div class="divider"></div>

                    <div class="notice">
                      ⏰&nbsp; This link expires in <strong>24 hours</strong>.
                    </div>

                    <div class="notice">
                      ℹ️&nbsp; If you didn't create a Prolance account, you can safely ignore this email.
                    </div>
                  </div>

                  <div class="footer">
                    &copy; %d Prolance &nbsp;&middot;&nbsp;
                    <a href="#">Privacy Policy</a> &nbsp;&middot;&nbsp;
                    <a href="#">Help</a>
                  </div>

                </div>
              </div>
            </body>
            </html>
            """.formatted(BASE_STYLES, verifyLink, year);

        sendHtmlEmail(toEmail, "Verify your Prolance email address", html);
    }

    // ── Shared helper ─────────────────────────────────────────────────────────
    private void sendHtmlEmail(String to, String subject, String html) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        helper.setFrom("noreply@prolance.com");
        mailSender.send(message);
    }
}