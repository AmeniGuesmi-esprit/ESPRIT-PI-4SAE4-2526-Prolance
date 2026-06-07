package tn.esprit.microservice.subscriptionservice.subscription.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.theokanning.openai.embedding.EmbeddingRequest;
import com.theokanning.openai.service.OpenAiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.UserEmbedding;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SimilarUserDTO;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.UserProfileDTO;
import tn.esprit.microservice.subscriptionservice.subscription.repository.UserEmbeddingRepository;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddingService {

    private final UserEmbeddingRepository embeddingRepository;
    private final ObjectMapper objectMapper;

    @Value("${recommendation.openai.api-key:#{null}}")
    private String apiKey;

    @Value("${recommendation.openai.embedding-model:text-embedding-3-small}")
    private String embeddingModel;

    /**
     * Génère et stocke l'embedding pour un profil utilisateur
     */
    public UserEmbedding generateAndStoreEmbedding(UserProfileDTO profile) {
        log.info("Generating embedding for user: {}", profile.getUserId());

        // Vérifier si l'API key est configurée
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("OpenAI API key not configured, using mock embedding");
            return generateMockEmbedding(profile);
        }

        try {
            // Convertir le profil en texte
            String profileText = profile.toEmbeddingText();

            // Appeler OpenAI Embeddings API
            OpenAiService service = new OpenAiService(apiKey, Duration.ofSeconds(30));

            EmbeddingRequest request = EmbeddingRequest.builder()
                    .model(embeddingModel)
                    .input(List.of(profileText))
                    .build();

            List<Double> vector = service.createEmbeddings(request)
                    .getData()
                    .get(0)
                    .getEmbedding();

            // Sauvegarder en base
            return saveEmbedding(profile, vector);

        } catch (Exception e) {
            log.error("Error generating embedding with OpenAI, using mock", e);
            return generateMockEmbedding(profile);
        }
    }

    /**
     * Génère un embedding mock pour le développement
     */
    private UserEmbedding generateMockEmbedding(UserProfileDTO profile) {
        // Générer un vecteur mock basé sur les caractéristiques du profil
        List<Double> mockVector = new ArrayList<>();
        Random random = new Random(profile.getUserId()); // Seed pour reproductibilité

        for (int i = 0; i < 1536; i++) {
            // Ajouter une composante basée sur les métriques du profil
            double base = random.nextGaussian();
            if (profile.getProjectsUsagePercent() != null) {
                base += profile.getProjectsUsagePercent() / 1000.0;
            }
            if (profile.getConversionRate() != null) {
                base += profile.getConversionRate() / 500.0;
            }
            mockVector.add(base);
        }

        // Normaliser le vecteur
        double norm = Math.sqrt(mockVector.stream().mapToDouble(d -> d * d).sum());
        List<Double> normalizedVector = mockVector.stream()
                .map(d -> d / norm)
                .collect(Collectors.toList());

        return saveEmbedding(profile, normalizedVector);
    }

    private UserEmbedding saveEmbedding(UserProfileDTO profile, List<Double> vector) {
        UserEmbedding embedding = embeddingRepository
                .findByUserId(profile.getUserId())
                .orElse(new UserEmbedding());

        embedding.setUserId(profile.getUserId());
        embedding.setUserType(profile.getUserType());
        embedding.setPlanTier(profile.getCurrentTier());
        embedding.setUsageLevel(determineUsageLevel(profile));
        embedding.setVectorDimension(vector.size());

        try {
            embedding.setEmbeddingVector(objectMapper.writeValueAsString(vector));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize embedding vector", e);
        }

        return embeddingRepository.save(embedding);
    }

    /**
     * Trouve les utilisateurs similaires par cosine similarity
     */
    public List<SimilarUserDTO> findSimilarUsers(Long userId, int limit) {
        log.info("Finding similar users for: {}", userId);

        Optional<UserEmbedding> userEmbeddingOpt = embeddingRepository.findByUserId(userId);

        if (userEmbeddingOpt.isEmpty()) {
            log.warn("No embedding found for user: {}", userId);
            return Collections.emptyList();
        }

        UserEmbedding userEmbedding = userEmbeddingOpt.get();
        List<Double> userVector = parseVector(userEmbedding.getEmbeddingVector());

        // Récupérer tous les embeddings du même type mais de tier supérieur (top performers)
        List<String> higherTiers = getHigherTiers(userEmbedding.getPlanTier());

        if (higherTiers.isEmpty()) {
            // Si déjà au tier max, chercher parmi les pairs du même tier
            higherTiers = List.of(userEmbedding.getPlanTier());
        }

        List<UserEmbedding> candidates = embeddingRepository
                .findByUserTypeAndPlanTierIn(userEmbedding.getUserType(), higherTiers);

        // Calculer la similarité et trier
        return candidates.stream()
                .filter(e -> !e.getUserId().equals(userId))
                .map(candidate -> {
                    List<Double> candidateVector = parseVector(candidate.getEmbeddingVector());
                    double similarity = cosineSimilarity(userVector, candidateVector);
                    return SimilarUserDTO.builder()
                            .userId(candidate.getUserId())
                            .similarityScore(similarity)
                            .planTier(candidate.getPlanTier())
                            .userType(candidate.getUserType())
                            .build();
                })
                .filter(s -> s.getSimilarityScore() > 0.5) // Seuil de similarité
                .sorted((a, b) -> Double.compare(b.getSimilarityScore(), a.getSimilarityScore()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * Calcule la similarité cosinus entre deux vecteurs
     */
    private double cosineSimilarity(List<Double> v1, List<Double> v2) {
        if (v1.size() != v2.size()) {
            log.warn("Vectors have different dimensions: {} vs {}", v1.size(), v2.size());
            return 0.0;
        }

        double dotProduct = 0.0;
        double norm1 = 0.0;
        double norm2 = 0.0;

        for (int i = 0; i < v1.size(); i++) {
            dotProduct += v1.get(i) * v2.get(i);
            norm1 += v1.get(i) * v1.get(i);
            norm2 += v2.get(i) * v2.get(i);
        }

        if (norm1 == 0 || norm2 == 0) {
            return 0.0;
        }

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    private List<Double> parseVector(String json) {
        if (json == null || json.isEmpty()) {
            return Collections.emptyList();
        }

        try {
            return objectMapper.readValue(json, new TypeReference<List<Double>>() {});
        } catch (JsonProcessingException e) {
            log.error("Failed to parse embedding vector", e);
            return Collections.emptyList();
        }
    }

    private String determineUsageLevel(UserProfileDTO profile) {
        int projectUsage = profile.getProjectsUsagePercent() != null ? profile.getProjectsUsagePercent() : 0;
        int proposalUsage = profile.getProposalsUsagePercent() != null ? profile.getProposalsUsagePercent() : 0;
        int avgUsage = (projectUsage + proposalUsage) / 2;

        if (avgUsage >= 80) return "HIGH";
        if (avgUsage >= 40) return "MEDIUM";
        return "LOW";
    }

    private List<String> getHigherTiers(String currentTier) {
        if (currentTier == null) return List.of("pro", "elite");

        return switch (currentTier.toLowerCase()) {
            case "starter" -> List.of("pro", "elite");
            case "pro" -> List.of("elite");
            case "elite" -> List.of(); // Déjà au max
            default -> List.of("pro", "elite");
        };
    }

    /**
     * Supprime l'embedding d'un utilisateur
     */
    public void deleteEmbedding(Long userId) {
        embeddingRepository.deleteByUserId(userId);
    }

    /**
     * Vérifie si un embedding existe pour un utilisateur
     */
    public boolean hasEmbedding(Long userId) {
        return embeddingRepository.existsByUserId(userId);
    }
}