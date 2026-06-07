package com.esprit.activityservice.dto;


import java.time.LocalDateTime;

public class EventDTO {
    private Long idEvent;
    private String title;
    private String location;
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    public EventDTO() {}

    public EventDTO(Long idEvent, String title, String location, LocalDateTime startDate, LocalDateTime endDate) {
        this.idEvent = idEvent;
        this.title = title;
        this.location = location;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public Long getIdEvent() {
        return idEvent;
    }

    public void setIdEvent(Long idEvent) {
        this.idEvent = idEvent;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public LocalDateTime getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDateTime startDate) {
        this.startDate = startDate;
    }

    public LocalDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDateTime endDate) {
        this.endDate = endDate;
    }
}
