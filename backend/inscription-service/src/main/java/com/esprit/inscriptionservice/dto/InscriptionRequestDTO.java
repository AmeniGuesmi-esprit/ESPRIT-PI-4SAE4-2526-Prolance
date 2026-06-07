package com.esprit.inscriptionservice.dto;

import com.esprit.inscriptionservice.entities.Domaine;
import com.esprit.inscriptionservice.entities.ParticipantRole;
import jakarta.validation.constraints.NotNull;

public class InscriptionRequestDTO {

    private String participantNom;
    private String participantPrenom;
    private String participantEmail;
    private Domaine domaine;
    private ParticipantRole participantRole;
    private String message;
    private String imageUrl;

    @NotNull(message = "userId est obligatoire")
    private Long userId;

    @NotNull(message = "eventId est obligatoire")
    private Long eventId;



    public String getParticipantNom() { return participantNom; }
    public void setParticipantNom(String participantNom) { this.participantNom = participantNom; }

    public String getParticipantPrenom() { return participantPrenom; }
    public void setParticipantPrenom(String participantPrenom) { this.participantPrenom = participantPrenom; }

    public String getParticipantEmail() { return participantEmail; }
    public void setParticipantEmail(String participantEmail) { this.participantEmail = participantEmail; }

    public Domaine getDomaine() { return domaine; }
    public void setDomaine(Domaine domaine) { this.domaine = domaine; }

    public ParticipantRole getParticipantRole() { return participantRole; }
    public void setParticipantRole(ParticipantRole participantRole) { this.participantRole = participantRole; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
}
