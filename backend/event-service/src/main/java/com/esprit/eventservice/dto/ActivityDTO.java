package com.esprit.eventservice.dto;

public class ActivityDTO {
    private Long idActivity;
    private String name;
    private String description;
    private String requirements;
    private Long eventId;   // ← AJOUTÉ : nécessaire pour lier l'activité à l'event



    public Long getIdActivity() { return idActivity; }
    public void setIdActivity(Long idActivity) { this.idActivity = idActivity; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRequirements() { return requirements; }
    public void setRequirements(String requirements) { this.requirements = requirements; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
}