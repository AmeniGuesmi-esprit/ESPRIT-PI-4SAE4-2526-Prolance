package tn.esprit.microservice.subscriptionservice.subscription.domain.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_embeddings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;

    @Column(name = "user_type", length = 20)
    private String userType;

    @Column(name = "plan_tier", length = 20)
    private String planTier;

    // Stocké comme JSON array de floats (1536 dimensions pour text-embedding-3-small)
    @Column(name = "embedding_vector", columnDefinition = "JSON")
    private String embeddingVector;

    @Column(name = "vector_dimension")
    private Integer vectorDimension = 1536;

    @Column(name = "usage_level", length = 10)
    private String usageLevel; // LOW, MEDIUM, HIGH

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}