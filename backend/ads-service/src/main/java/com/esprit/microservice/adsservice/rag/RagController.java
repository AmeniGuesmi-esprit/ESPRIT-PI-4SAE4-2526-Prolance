package com.esprit.microservice.adsservice.rag;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rag")
@RequiredArgsConstructor
@Slf4j
public class RagController {

    private final RagService ragService;
    private final OllamaEmbeddingService embeddingService;

    @PostMapping("/ask")
    public ResponseEntity<RagService.RagResponse> ask(@RequestBody AskRequest request) {
        log.info("[RAG API] Question: {}", request.getQuestion());
        RagService.RagResponse response = ragService.ask(request.getQuestion());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/debug-embed")
    public ResponseEntity<java.util.Map<String, Object>> debugEmbed(@RequestBody AskRequest request) {
        try {
            java.util.List<Float> embedding = ragService.debugEmbed(request.getQuestion());
            return ResponseEntity.ok(java.util.Map.of("size", embedding.size(), "success", !embedding.isEmpty(), "lastError", embeddingService.getLastError()));
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.Map.of("error", e.getMessage(), "success", false));
        }
    }

    @Data
    public static class AskRequest {
        private String question;
    }
}
