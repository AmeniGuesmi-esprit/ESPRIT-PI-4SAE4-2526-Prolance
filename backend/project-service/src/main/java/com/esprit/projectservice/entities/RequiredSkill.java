package com.esprit.projectservice.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "project_required_skills")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RequiredSkill {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private String skillName;
    private String level;
    private Integer yearsExperience;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonBackReference private Project project;
}
