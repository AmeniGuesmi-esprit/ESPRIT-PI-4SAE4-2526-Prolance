package com.esprit.skillservice.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "freelancer_skills")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FreelancerSkill {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String skillName;

    private String level; // BEGINNER / INTERMEDIATE / EXPERT
    private int yearsExperience;

    // IDs from other services — no FK
    private Long freelancerId;
    private Long projectId; // optional: which project requires this skill
}
