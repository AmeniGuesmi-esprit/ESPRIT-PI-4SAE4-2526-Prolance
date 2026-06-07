package tn.esprit.microservice.promoservice.dto;
import java.time.LocalDateTime;

public class PromoRecommendationDTO {
    private Long id;
    private String code;
    private Integer discountPercent;
    private String description;
    private LocalDateTime expiresAt;
    private Integer remainingUses;
    private String aiReason;          // Raison IA de la recommandation
    private Double relevanceScore;    // Score de pertinence 0-100
    private String targetAudience;    // FREELANCER ou CLIENT
    private Boolean isPersonalized;   // Si recommandé spécifiquement pour l'utilisateur

    // Constructeur vide
    public PromoRecommendationDTO() {}

    // Constructeur complet
    public PromoRecommendationDTO(Long id, String code, Integer discountPercent,
                                  String description, LocalDateTime expiresAt,
                                  Integer remainingUses, String aiReason,
                                  Double relevanceScore, String targetAudience,
                                  Boolean isPersonalized) {
        this.id = id;
        this.code = code;
        this.discountPercent = discountPercent;
        this.description = description;
        this.expiresAt = expiresAt;
        this.remainingUses = remainingUses;
        this.aiReason = aiReason;
        this.relevanceScore = relevanceScore;
        this.targetAudience = targetAudience;
        this.isPersonalized = isPersonalized;
    }

    // Getters
    public Long getId() { return id; }
    public String getCode() { return code; }
    public Integer getDiscountPercent() { return discountPercent; }
    public String getDescription() { return description; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public Integer getRemainingUses() { return remainingUses; }
    public String getAiReason() { return aiReason; }
    public Double getRelevanceScore() { return relevanceScore; }
    public String getTargetAudience() { return targetAudience; }
    public Boolean getIsPersonalized() { return isPersonalized; }

    // Setters
    public void setId(Long id) { this.id = id; }
    public void setCode(String code) { this.code = code; }
    public void setDiscountPercent(Integer discountPercent) { this.discountPercent = discountPercent; }
    public void setDescription(String description) { this.description = description; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public void setRemainingUses(Integer remainingUses) { this.remainingUses = remainingUses; }
    public void setAiReason(String aiReason) { this.aiReason = aiReason; }
    public void setRelevanceScore(Double relevanceScore) { this.relevanceScore = relevanceScore; }
    public void setTargetAudience(String targetAudience) { this.targetAudience = targetAudience; }
    public void setIsPersonalized(Boolean isPersonalized) { this.isPersonalized = isPersonalized; }
}