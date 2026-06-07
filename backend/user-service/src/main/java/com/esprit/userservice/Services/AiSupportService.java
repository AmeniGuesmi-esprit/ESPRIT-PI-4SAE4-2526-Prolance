package com.esprit.userservice.Services;

import com.esprit.userservice.Entities.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class AiSupportService {

    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL        = "llama-3.3-70b-versatile";

    @Value("${groq.api.key}")
    private String apiKey;

    private final HttpClient   httpClient   = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String answer(User user, String question) {
        try {
            String systemPrompt = buildSystemPrompt(user);

            Map<String, Object> requestBody = Map.of(
                    "model",    MODEL,
                    "messages", List.of(
                            Map.of("role", "system",  "content", systemPrompt),
                            Map.of("role", "user",    "content", question)
                    ),
                    "max_tokens",  300,
                    "temperature", 0.7
            );

            String body = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GROQ_API_URL))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type",  "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.err.println("❌ Groq error " + response.statusCode() + ": " + response.body());
                return fallbackAnswer(user, question);
            }

            // Groq response shape: choices[0].message.content
            Map<?, ?>  outer   = objectMapper.readValue(response.body(), Map.class);
            List<?>    choices = (List<?>) outer.get("choices");
            Map<?, ?>  message = (Map<?, ?>) ((Map<?, ?>) choices.get(0)).get("message");
            return ((String) message.get("content")).trim();

        } catch (Exception e) {
            System.err.println("❌ AiSupportService exception: " + e.getMessage());
            return fallbackAnswer(user, question);
        }
    }

    private String buildSystemPrompt(User user) {
        String status;
        if (!user.isEnabled()) {
            status = "DEACTIVATED — disabled by an administrator" +
                    (user.getReportCount() >= 3 ? " after receiving " + user.getReportCount() + " reports" : "");
        } else if (user.isTimedOut()) {
            status = "TIMED OUT until " + user.getTimeoutUntil();
        } else {
            status = "ACTIVE and in good standing";
        }

        return String.format(
                "You are a friendly, concise support assistant for a freelancing platform called PiDev.\n\n" +
                        "You are speaking with %s %s.\n" +
                        "Email: %s\n" +
                        "Role: %s\n" +
                        "Account status: %s\n" +
                        "Times reported: %d\n" +
                        "Email verified: %s\n\n" +
                        "Rules:\n" +
                        "- Answer ONLY questions about their account, platform features, or common tasks.\n" +
                        "- Keep answers short (2-4 sentences max).\n" +
                        "- Be friendly and helpful.\n" +
                        "- Do NOT reveal passwords, tokens, or other users data.\n" +
                        "- If you cannot help, say: contact support@pidev.tn",
                user.getName(), user.getLastName(),
                user.getEmail(),
                user.getRole() != null ? user.getRole().name() : "USER",
                status,
                user.getReportCount(),
                user.isEmailVerified() ? "yes" : "no"
        );
    }

    // ── Rule-based fallback if Groq is unavailable ────────────────────────
    private String fallbackAnswer(User user, String question) {
        String q = question.toLowerCase();
        if (contains(q, "disabled", "deactivated", "blocked"))
            return user.isEnabled() ? "Your account is active." :
                    "Your account was deactivated. Contact support@pidev.tn.";
        if (contains(q, "timeout", "timed out"))
            return user.isTimedOut() ? "You are timed out until " + user.getTimeoutUntil() + "." :
                    "You have no active timeout.";
        if (contains(q, "password"))
            return "Go to Profile → Settings → Change Password.";
        if (contains(q, "report"))
            return "You have " + user.getReportCount() + " report(s) on your account.";
        if (contains(q, "email", "verify"))
            return user.isEmailVerified() ? "Your email is verified." :
                    "Please verify your email — check your inbox.";
        return "Please contact support@pidev.tn for assistance.";
    }

    private boolean contains(String q, String... keywords) {
        for (String k : keywords) if (q.contains(k)) return true;
        return false;
    }
}