package com.esprit.activityservice.dto;


public class ActivityResponseDTO {
    private Long idActivity;
    private String name;
    private String description;
    private String requirements;
    private Long eventId;
    private String eventTitle;
    private String eventLocation;

    public ActivityResponseDTO() {}

    public ActivityResponseDTO(Long idActivity, String name, String description, String requirements, Long eventId, String eventTitle, String eventLocation) {
        this.idActivity = idActivity;
        this.name = name;
        this.description = description;
        this.requirements = requirements;
        this.eventId = eventId;
        this.eventTitle = eventTitle;
        this.eventLocation = eventLocation;
    }

    public Long getIdActivity() {
        return idActivity;
    }

    public void setIdActivity(Long idActivity) {
        this.idActivity = idActivity;
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

    public String getEventTitle() {
        return eventTitle;
    }

    public void setEventTitle(String eventTitle) {
        this.eventTitle = eventTitle;
    }

    public String getEventLocation() {
        return eventLocation;
    }

    public void setEventLocation(String eventLocation) {
        this.eventLocation = eventLocation;
    }
}
