package com.esprit.microservice.adsservice.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class QdrantService {

    private static final String COLLECTION_NAME = "ad_campaigns";
    private static final int VECTOR_SIZE = 768;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Value("${qdrant.url:http://localhost:6333}")
    private String qdrantUrl;

    public QdrantService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @PostConstruct
    public void initCollection() {
        try {
            HttpRequest checkReq = HttpRequest.newBuilder()
                    .uri(URI.create(qdrantUrl + "/collections/" + COLLECTION_NAME))
                    .GET().build();
            HttpResponse<String> checkResp = httpClient.send(checkReq, HttpResponse.BodyHandlers.ofString());

            if (checkResp.statusCode() == 200) {
                log.info("[QDRANT] Collection '{}' already exists", COLLECTION_NAME);
                return;
            }

            Map<String, Object> body = Map.of(
                "vectors", Map.of(
                    "size", VECTOR_SIZE,
                    "distance", "Cosine"
                )
            );

            HttpRequest createReq = HttpRequest.newBuilder()
                    .uri(URI.create(qdrantUrl + "/collections/" + COLLECTION_NAME))
                    .header("Content-Type", "application/json")
                    .PUT(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> createResp = httpClient.send(createReq, HttpResponse.BodyHandlers.ofString());
            log.info("[QDRANT] Collection created: {} - {}", createResp.statusCode(), createResp.body());

        } catch (Exception e) {
            log.warn("[QDRANT] Could not initialize collection (Qdrant may not be running): {}", e.getMessage());
        }
    }

    public void upsertAd(Long adId, List<Float> embedding, Map<String, Object> payload) {
        try {
            Map<String, Object> point = Map.of(
                "id", adId,
                "vector", embedding,
                "payload", payload
            );
            Map<String, Object> body = Map.of("points", List.of(point));

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(qdrantUrl + "/collections/" + COLLECTION_NAME + "/points"))
                    .header("Content-Type", "application/json")
                    .PUT(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            log.info("[QDRANT] Upserted ad {} - status: {}", adId, resp.statusCode());

        } catch (Exception e) {
            log.error("[QDRANT] Failed to upsert ad {}: {}", adId, e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> search(List<Float> queryEmbedding, int topK) {
        try {
            Map<String, Object> body = Map.of(
                "vector", queryEmbedding,
                "limit", topK,
                "with_payload", true
            );

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(qdrantUrl + "/collections/" + COLLECTION_NAME + "/points/search"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200) {
                Map<String, Object> result = objectMapper.readValue(resp.body(), Map.class);
                List<Map<String, Object>> hits = (List<Map<String, Object>>) result.get("result");
                log.info("[QDRANT] Search returned {} results", hits != null ? hits.size() : 0);
                return hits != null ? hits : List.of();
            }

            log.warn("[QDRANT] Search failed with status {}: {}", resp.statusCode(), resp.body());
            return List.of();

        } catch (Exception e) {
            log.error("[QDRANT] Search failed: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public void deleteAd(Long adId) {
        try {
            Map<String, Object> body = Map.of("points", List.of(adId));
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(qdrantUrl + "/collections/" + COLLECTION_NAME + "/points/delete"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            log.info("[QDRANT] Deleted ad {} from vector DB", adId);
        } catch (Exception e) {
            log.error("[QDRANT] Failed to delete ad {}: {}", adId, e.getMessage(), e);
        }
    }
}
