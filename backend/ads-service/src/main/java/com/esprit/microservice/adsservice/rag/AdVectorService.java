package com.esprit.microservice.adsservice.rag;

import com.esprit.microservice.adsservice.entities.AdCampaign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdVectorService {

    private final OllamaEmbeddingService embeddingService;
    private final QdrantService qdrantService;

    public void indexAd(AdCampaign campaign) {
        try {
            String textToEmbed = buildAdText(campaign);
            log.info("[RAG] Indexing ad {} to vector DB: {}...", campaign.getId(),
                    textToEmbed.substring(0, Math.min(80, textToEmbed.length())));

            List<Float> embedding = embeddingService.embed(textToEmbed);
            if (embedding.isEmpty()) {
                log.warn("[RAG] Empty embedding for ad {}. Skipping indexing.", campaign.getId());
                return;
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("adId", campaign.getId());
            payload.put("title", campaign.getTitle());
            payload.put("description", campaign.getDescription() != null ? campaign.getDescription() : "");
            payload.put("status", campaign.getStatus().name());
            payload.put("roleType", campaign.getRoleType() != null ? campaign.getRoleType().name() : "");
            payload.put("userId", campaign.getUserId());
            payload.put("imageUrl", campaign.getImageUrl() != null ? campaign.getImageUrl() : "");
            payload.put("targetUrl", campaign.getTargetUrl() != null ? campaign.getTargetUrl() : "");
            payload.put("planName", campaign.getPlan() != null ? campaign.getPlan().getName() : "");

            qdrantService.upsertAd(campaign.getId(), embedding, payload);
            log.info("[RAG] Ad {} indexed successfully in vector DB", campaign.getId());

        } catch (Exception e) {
            log.error("[RAG] Failed to index ad {}: {}", campaign.getId(), e.getMessage(), e);
        }
    }

    public void removeAd(Long adId) {
        qdrantService.deleteAd(adId);
    }

    private String buildAdText(AdCampaign campaign) {
        StringBuilder sb = new StringBuilder();
        sb.append("Ad Title: ").append(campaign.getTitle());
        if (campaign.getDescription() != null && !campaign.getDescription().isBlank()) {
            sb.append(". Description: ").append(campaign.getDescription());
        }
        if (campaign.getRoleType() != null) {
            sb.append(". Target audience: ").append(campaign.getRoleType().name().toLowerCase());
        }
        if (campaign.getPlan() != null) {
            sb.append(". Ad type: ").append(campaign.getPlan().getName());
        }
        sb.append(". Status: ").append(campaign.getStatus().name().toLowerCase());
        return sb.toString();
    }
}
