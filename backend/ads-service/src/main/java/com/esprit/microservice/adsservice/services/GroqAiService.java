package com.esprit.microservice.adsservice.services;

import com.esprit.microservice.adsservice.dto.AiSuggestionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GroqAiService {

    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.model:llama-3.3-70b-versatile}")
    private String groqModel;

    private final RestTemplate restTemplate;

    public AiSuggestionResponse generateAdSuggestion(String userPrompt) {
        log.info("[GROQ AI] Generating ad suggestion for prompt: {}", userPrompt);

        try {
            String systemPrompt = "You are an expert ad copywriter. Generate a catchy ad title (max 120 chars) and " +
                    "a short ad description (max 500 chars) based on the user's prompt. " +
                    "Respond ONLY in this exact JSON format: {\"title\": \"...\", \"description\": \"...\"}";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> requestBody = Map.of(
                "model", groqModel,
                "messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.7,
                "max_tokens", 300
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(GROQ_API_URL, request, (Class<Map<String, Object>>) (Class<?>) Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                throw new IllegalStateException("Empty response from Groq API");
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String content = (String) message.get("content");

            log.info("[GROQ AI] Raw response: {}", content);

            return parseGroqResponse(content);

        } catch (Exception e) {
            log.error("[GROQ AI] Error during generation: {}", e.getMessage(), e);
            return new AiSuggestionResponse(
                "AI-Generated Ad Title",
                "Something went wrong. Please try again or write your own ad."
            );
        }
    }

    private AiSuggestionResponse parseGroqResponse(String content) {
        try {
            content = content.trim();
            if (content.startsWith("```json")) {
                content = content.substring(7);
            }
            if (content.endsWith("```")) {
                content = content.substring(0, content.length() - 3);
            }
            content = content.trim();

            int titleStart = content.indexOf("\"title\"") + 10;
            int titleEnd = content.indexOf("\"", titleStart);
            String title = content.substring(titleStart, titleEnd);

            int descStart = content.indexOf("\"description\"") + 16;
            int descEnd = content.indexOf("\"", descStart);
            String description = content.substring(descStart, descEnd);

            return new AiSuggestionResponse(title, description);

        } catch (Exception e) {
            log.error("[GROQ AI] Failed to parse response: {}", content, e);
            return new AiSuggestionResponse(
                "Creative Ad Title Here",
                "Engaging description based on your prompt. Edit to customize!"
            );
        }
    }
}
