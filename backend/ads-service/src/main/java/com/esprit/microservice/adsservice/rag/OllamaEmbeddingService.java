package com.esprit.microservice.adsservice.rag;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OllamaEmbeddingService {

    private final RestTemplate restTemplate;

    public OllamaEmbeddingService(@Qualifier("ragRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${spring.ai.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${rag.embedding.model:nomic-embed-text}")
    private String embeddingModel;

    private volatile String lastError = "none";

    public String getLastError() { return lastError; }

    @SuppressWarnings("unchecked")
    public List<Float> embed(String text) {
        try {
            String url = ollamaBaseUrl.trim() + "/api/embed";
            log.info("[EMBEDDING] Calling {} with model '{}' (interceptors: {})",
                    url, embeddingModel, restTemplate.getInterceptors().size());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of(
                "model", embeddingModel,
                "input", text
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            Map<String, Object> result = restTemplate.postForObject(url, request, Map.class);

            if (result != null) {
                List<List<Number>> embeddings = (List<List<Number>>) result.get("embeddings");
                if (embeddings != null && !embeddings.isEmpty()) {
                    List<Float> vector = embeddings.get(0).stream()
                            .map(Number::floatValue)
                            .toList();
                    log.info("[EMBEDDING] Generated embedding of size {} for text: {}...",
                            vector.size(), text.substring(0, Math.min(50, text.length())));
                    lastError = "none";
                    return vector;
                }
                lastError = "Response had no embeddings field. Keys: " + result.keySet();
            } else {
                lastError = "Null response from Ollama";
            }

            log.error("[EMBEDDING] Unexpected response: {}", result);
            return List.of();

        } catch (Exception e) {
            lastError = e.getClass().getSimpleName() + ": " + e.getMessage();
            log.error("[EMBEDDING] Error generating embedding: {}", e.getMessage(), e);
            return List.of();
        }
    }
}
