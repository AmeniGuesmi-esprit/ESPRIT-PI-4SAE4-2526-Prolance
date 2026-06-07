package com.esprit.userservice.Services;

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
import java.util.Random;

@Service
public class AiBioService {

    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL        = "llama-3.3-70b-versatile";

    @Value("${groq.api.key}")
    private String apiKey;

    private final HttpClient   httpClient   = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Random       random       = new Random();

    public String generateBio(
            String firstName,
            String lastName,
            String role,
            String tone,
            String extra
    ) {
        try {
            String roleDesc = switch (role.toUpperCase()) {
                case "FREELANCER" -> "a freelancer offering services on the platform";
                case "CLIENT"     -> "a client looking to hire talented freelancers";
                case "ADMIN"      -> "a platform administrator";
                default           -> "a platform user";
            };

            String toneDesc = switch (tone.toLowerCase()) {
                case "creative" -> "creative and imaginative";
                case "casual"   -> "friendly and conversational";
                default         -> "professional and concise";
            };

            String userPrompt = String.format(
                    "Write a %s bio for %s %s, who is %s.%s\n\n" +
                            "Requirements:\n" +
                            "- 2-3 sentences max, under 60 words\n" +
                            "- No placeholder text\n" +
                            "- No quotes around the bio\n" +
                            "- Just the bio text, nothing else",
                    toneDesc, firstName, lastName, roleDesc,
                    extra != null && !extra.isBlank() ? " Extra context: " + extra : ""
            );

            Map<String, Object> requestBody = Map.of(
                    "model",    MODEL,
                    "messages", List.of(
                            Map.of("role", "system", "content",
                                    "You are a professional copywriter for a freelancing platform. " +
                                            "Write short punchy bios. Respond with ONLY the bio text."),
                            Map.of("role", "user", "content", userPrompt)
                    ),
                    "max_tokens",  150,
                    "temperature", 0.8
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
                return fallbackBio(firstName, lastName, role, tone, extra);
            }

            Map<?, ?>  outer   = objectMapper.readValue(response.body(), Map.class);
            List<?>    choices = (List<?>) outer.get("choices");
            Map<?, ?>  message = (Map<?, ?>) ((Map<?, ?>) choices.get(0)).get("message");
            return ((String) message.get("content")).trim();

        } catch (Exception e) {
            System.err.println("❌ AiBioService exception: " + e.getMessage());
            return fallbackBio(firstName, lastName, role, tone, extra);
        }
    }

    // ── Template fallback if Groq is unavailable ──────────────────────────
    private String fallbackBio(String first, String last, String role, String tone, String extra) {
        String base = switch (role.toUpperCase()) {
            case "FREELANCER" -> first + " " + last +
                    " is a skilled freelancer delivering high-quality work on time. " +
                    "Committed to exceeding client expectations on every project.";
            case "CLIENT" -> first + " " + last +
                    " is a client on PiDev looking to collaborate with talented professionals " +
                    "to bring great ideas to life.";
            default -> first + " " + last + " is a member of the PiDev platform.";
        };
        return extra != null && !extra.isBlank() ? base + " " + extra : base;
    }
}