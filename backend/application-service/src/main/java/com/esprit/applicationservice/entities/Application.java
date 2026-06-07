package com.esprit.applicationservice.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "applications",
       uniqueConstraints = @UniqueConstraint(columnNames = {"freelancer_id", "project_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Application {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "freelancer_id", nullable = false)
    private Long freelancerId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "cover_letter_url")
    private String coverLetterUrl;

    @Column(nullable = false)
    private boolean accepted = false;

    @Column(updatable = false)
    private LocalDateTime appliedAt;

    @PrePersist
    public void prePersist() {
        this.appliedAt = LocalDateTime.now();
    }
}
