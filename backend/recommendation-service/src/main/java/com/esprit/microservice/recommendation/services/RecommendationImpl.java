package com.esprit.microservice.recommendation.services;

import com.esprit.microservice.recommendation.dto.RecommendationDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RecommendationImpl {

    private final WebClient webClient;

    @Value("${recommendation.engine.url}")
    private String engineUrl;


    public RecommendationImpl(WebClient webClient) {
        this.webClient = webClient;
    }

    public List<RecommendationDTO> getRecommendations(String userId, int n) {

        Map<String, Object> body = Map.of("user_id", userId, "n", n);

        Map response = webClient.post()
                .uri(engineUrl + "/recommend")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, res ->
                        Mono.error(new RuntimeException("Utilisateur non trouvé dans le dataset ML")))
                .bodyToMono(Map.class)
                .block();

        List<Map<String, Object>> recs =
                (List<Map<String, Object>>) response.get("recommendations");

        return recs.stream().map(r -> new RecommendationDTO(
                (String) r.get("event_id"),
                (String) r.get("event_name"),
                (String) r.get("category"),
                (String) r.get("level"),
                (String) r.get("format"),
                toDouble(r.get("avg_rating")),
                toDouble(r.get("hybrid_score"))
        )).collect(Collectors.toList());
    }


    private Double toDouble(Object val) {
        return val == null ? 0.0 : ((Number) val).doubleValue();
    }

}