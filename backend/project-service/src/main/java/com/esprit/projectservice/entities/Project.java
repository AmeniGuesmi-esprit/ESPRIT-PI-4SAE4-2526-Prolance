package com.esprit.projectservice.entities;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "projects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Project {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 200) private String title;
    @Column(columnDefinition = "TEXT", nullable = false) private String description;
    private Double budget;
    private LocalDate startDate;
    private LocalDate endDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ProjectStatus status;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Category category;
    @CreationTimestamp private LocalDateTime createdAt;
    @Column(name = "client_id", nullable = false) private Integer clientId;
    private String clientName;
    private String clientLastName;
    private String clientEmail;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference @Builder.Default
    private List<Task> tasks = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference @Builder.Default
    private List<RequiredSkill> requiredSkills = new ArrayList<>();
}
