package com.esprit.inscriptionservice.dto;

import com.esprit.inscriptionservice.entities.Domaine;
import com.esprit.inscriptionservice.entities.InscriptionStatus;
import com.esprit.inscriptionservice.entities.ParticipantRole;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class InscriptionResponseDTO {

    private Long id;
    private String participantNom;
    private String participantPrenom;
    private String participantEmail;
    private LocalDateTime registrationDate;
    private Domaine domaine;
    private ParticipantRole participantRole;
    private String imageUrl;
    private String message;
    private String badgeImagePath;
    private InscriptionStatus status;
    private Long userId;
    private Long eventId;
    private String eventTitle;
    private LocalDateTime eventStartDate;
    private String eventLocation;
    private LocalDateTime waitlistDate;
}