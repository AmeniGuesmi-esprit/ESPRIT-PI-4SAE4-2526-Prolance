package com.esprit.reactionservice.entities;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "reactions", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "publication_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Reaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private TypeReaction type;
    @Column(name = "user_id", nullable = false) private Integer userId;
    @Column(name = "publication_id", nullable = false) private Integer publicationId;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}
