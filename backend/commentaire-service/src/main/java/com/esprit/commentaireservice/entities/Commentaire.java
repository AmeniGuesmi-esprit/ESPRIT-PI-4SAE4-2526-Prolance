package com.esprit.commentaireservice.entities;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "commentaires")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Commentaire {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Integer id;
    @Column(nullable = false, columnDefinition = "TEXT") private String contenue;
    @Column(name = "create_at", nullable = false, updatable = false) private LocalDateTime createAt;
    @Column(name = "user_id", nullable = false) private Integer userId;
    @Transient private Object user;
    @Column(name = "publication_id", nullable = false) private Integer publicationId;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "parent_id") @JsonIgnoreProperties({"replies"}) private Commentaire parent;
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("parent") private List<Commentaire> replies = new ArrayList<>();
    @Column(name = "pinned", nullable = false) private boolean pinned = false;
    @PrePersist protected void onCreate() { createAt = LocalDateTime.now(); }
}
