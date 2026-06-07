package com.esprit.inscriptionservice.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "event_inscriptions")
public class EventInscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String participantNom;
    private String participantPrenom;
    private String participantEmail;
    private LocalDateTime registrationDate;
    private String badgeImagePath;

    @Column(columnDefinition = "LONGTEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    private Domaine domaine;

    @Enumerated(EnumType.STRING)
    private ParticipantRole participantRole;

    @Column(columnDefinition = "LONGTEXT")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    private InscriptionStatus status;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "event_id")
    private Long eventId;

    @Column(name = "waitlist_date")
    private LocalDateTime waitlistDate;
}