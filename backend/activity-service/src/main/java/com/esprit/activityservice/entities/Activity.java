package com.esprit.activityservice.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "activities")
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idActivity;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String requirements;

    // References Event from event-service (no JPA join across services)
    @Column(name = "event_id", nullable = false)
    private Long eventId;

    public Activity() {}

    public Activity(Long idActivity, String name, String description, String requirements, Long eventId) {
        this.idActivity = idActivity;
        this.name = name;
        this.description = description;
        this.requirements = requirements;
        this.eventId = eventId;
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
}
