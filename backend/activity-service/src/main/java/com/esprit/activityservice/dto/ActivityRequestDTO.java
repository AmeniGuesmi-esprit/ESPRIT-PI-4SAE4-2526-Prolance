package com.esprit.activityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ActivityRequestDTO {
    @NotBlank(message = "Le nom est obligatoire")
    private String name;

    private String description;
    private String requirements;

    @NotNull(message = "L'identifiant de l'événement est obligatoire")
    private Long eventId;

    public ActivityRequestDTO() {}

    public ActivityRequestDTO(String name, String description, String requirements, Long eventId) {
        this.name = name;
        this.description = description;
        this.requirements = requirements;
        this.eventId = eventId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getRequirements() {
        return requirements;
    }

    public void setRequirements(String requirements) {
        this.requirements = requirements;
    }

    public Long getEventId() {
        return eventId;
    }

    public void setEventId(Long eventId) {
        this.eventId = eventId;
    }
}
