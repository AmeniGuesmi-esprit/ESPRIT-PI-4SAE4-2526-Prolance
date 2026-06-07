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
import java.util.stream.Collectors;

@Service
@Slf4j
public class RagService {

    private final OllamaEmbeddingService embeddingService;
    private final QdrantService qdrantService;
    private final RestTemplate restTemplate;

    public RagService(OllamaEmbeddingService embeddingService, QdrantService qdrantService,
                      @Qualifier("ragRestTemplate") RestTemplate restTemplate) {
        this.embeddingService = embeddingService;
        this.qdrantService = qdrantService;
        this.restTemplate = restTemplate;
    }

    @Value("${spring.ai.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${rag.llm.model:phi3:mini}")
    private String llmModel;

    @Value("${rag.search.top-k:5}")
    private int topK;

    @SuppressWarnings("unchecked")
    public RagResponse ask(String question) {
        log.info("[RAG] Question received: {}", question);

        // 1. Embed the question
        List<Float> queryEmbedding = embeddingService.embed(question);
        if (queryEmbedding.isEmpty()) {
            return new RagResponse("Sorry, I couldn't process your question. The embedding service is unavailable.", List.of());
        }

        // 2. Search Qdrant for relevant ads
        List<Map<String, Object>> hits = qdrantService.search(queryEmbedding, topK);
        if (hits.isEmpty()) {
            return new RagResponse("I couldn't find any ads matching your question. The ad database might be empty.", List.of());
        }

        // 3. Build context from search results
        List<AdContext> adContexts = hits.stream()
                .map(hit -> {
                    Map<String, Object> payload = (Map<String, Object>) hit.get("payload");
                    double score = hit.get("score") instanceof Number n ? n.doubleValue() : 0.0;
                    return new AdContext(
                            payload.get("adId") != null ? Long.valueOf(payload.get("adId").toString()) : 0L,
                            (String) payload.getOrDefault("title", ""),
                            (String) payload.getOrDefault("description", ""),
                            (String) payload.getOrDefault("status", ""),
                            (String) payload.getOrDefault("roleType", ""),
                            (String) payload.getOrDefault("planName", ""),
                            score
                    );
                })
                .toList();

        String context = adContexts.stream()
                .map(ad -> String.format("- Ad #%d (relevance: %.0f%%): Title: \"%s\", Description: \"%s\", Status: %s, Target: %s, Plan: %s",
                        ad.adId(), ad.score() * 100, ad.title(), ad.description(), ad.status(), ad.roleType(), ad.planName()))
                .collect(Collectors.joining("\n"));

        log.info("[RAG] Found {} relevant ads. Generating response...", adContexts.size());

        // 4. Call Ollama LLM with context + question
        String answer = callLlm(question, context);

        return new RagResponse(answer, adContexts);
    }

    @SuppressWarnings("unchecked")
    private String callLlm(String question, String context) {
        try {
            String prompt = String.format("""
                    You are a helpful assistant for an advertising platform. Users ask questions about ads and campaigns.
                    
                    Here are the relevant ads from the database:
                    %s
                    
                    User question: %s
                    
                    Answer the user's question based ONLY on the ads above. Be specific, mention ad titles and details.
                    If none of the ads are relevant to the question, say so honestly.
                    Keep your answer concise and helpful.""", context, question);

            String url = ollamaBaseUrl.trim() + "/api/generate";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of(
                    "model", llmModel,
                    "prompt", prompt,
                    "stream", false
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            Map<String, Object> result = restTemplate.postForObject(url, request, Map.class);

            if (result != null) {
                String response = (String) result.get("response");
                log.info("[RAG] LLM response generated ({} chars)", response != null ? response.length() : 0);
                return response != null ? response.trim() : "No response generated.";
            }

            return "Sorry, I couldn't generate a response. The language model is unavailable.";

        } catch (Exception e) {
            log.error("[RAG] LLM call failed: {}", e.getMessage(), e);
            return "Sorry, an error occurred while generating the response: " + e.getMessage();
        }
    }

    public List<Float> debugEmbed(String text) {
        return embeddingService.embed(text);
    }

    public record AdContext(Long adId, String title, String description, String status, String roleType, String planName, double score) {}
    public record RagResponse(String answer, List<AdContext> relevantAds) {}
}
