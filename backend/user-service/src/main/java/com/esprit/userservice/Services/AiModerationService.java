package com.esprit.userservice.Services;

import com.fasterxml.jackson.core.type.TypeReference;
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
public class AiModerationService {

    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL        = "llama-3.3-70b-versatile";

    @Value("${groq.api.key}")
    private String apiKey;

    private final HttpClient   httpClient   = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ModerationVerdict analyseReport(
            String targetName,
            String targetEmail,
            int    reportCount,
            String category,
            String reason
    ) {
        try {
            String systemPrompt =
                    "You are a strict but fair moderation assistant for a freelancing platform. " +
                            "Analyse the report and respond ONLY with a valid JSON object — no preamble, no markdown. " +
                            "JSON shape: { \"severity\": \"low|medium|high\", \"action\": \"warn|timeout|deactivate\", \"justification\": \"one sentence\" }";

            String userPrompt = String.format(
                    "Reported user: %s (%s)\n" +
                            "Previous report count: %d\n" +
                            "Report category: %s\n" +
                            "Reason: %s\n\n" +
                            "Respond ONLY with JSON.",
                    targetName, targetEmail, reportCount,
                    category, reason == null || reason.isBlank() ? "not provided" : reason
            );

            Map<String, Object> requestBody = Map.of(
                    "model",    MODEL,
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user",   "content", userPrompt)
                    ),
                    "max_tokens",  200,
                    "temperature", 0.3
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
                return fallbackVerdict(reportCount, category, reason);
            }

            Map<?, ?>  outer   = objectMapper.readValue(response.body(), Map.class);
            List<?>    choices = (List<?>) outer.get("choices");
            Map<?, ?>  message = (Map<?, ?>) ((Map<?, ?>) choices.get(0)).get("message");
            String     text    = ((String) message.get("content")).trim()
                    .replaceAll("```json|```", "").trim();

            Map<String, String> verdict = objectMapper.readValue(text,
                    new TypeReference<Map<String, String>>() {});

            return new ModerationVerdict(
                    verdict.getOrDefault("severity",      "medium"),
                    verdict.getOrDefault("action",        "warn"),
                    verdict.getOrDefault("justification", "No justification provided.")
            );

        } catch (Exception e) {
            System.err.println("❌ AiModerationService exception: " + e.getMessage());
            return fallbackVerdict(reportCount, category, reason);
        }
    }

    // ── Rule-based fallback if Groq is unavailable ────────────────────────
    private ModerationVerdict fallbackVerdict(int reportCount, String category, String reason) {
        boolean serious = category != null &&
                (category.contains("fraud") || category.contains("abuse") || category.contains("harassment"));
        int effective = reportCount + (serious ? 2 : 0);

        if (effective >= 3)
            return new ModerationVerdict("high", "deactivate",
                    "User has " + reportCount + " reports for " + category + " — deactivation recommended.");
        if (effective >= 2)
            return new ModerationVerdict("medium", "timeout",
                    "User has " + reportCount + " reports for " + category + " — timeout advised.");
        return new ModerationVerdict("low", "warn",
                "First report for " + category + " — warning is appropriate.");
    }

    public record ModerationVerdict(String severity, String action, String justification) {}
}