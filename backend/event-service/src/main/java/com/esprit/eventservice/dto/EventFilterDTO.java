package com.esprit.eventservice.dto;

import com.esprit.eventservice.entities.CategoryEvent;
import com.esprit.eventservice.entities.EventStatus;
import java.time.LocalDateTime;

public class EventFilterDTO {
    private String titleContains;
    private String locationContains;
    private String descriptionContains;
    private EventStatus status;
    private CategoryEvent category;
    private LocalDateTime startDateFrom;
    private LocalDateTime startDateTo;
    private LocalDateTime endDateFrom;
    private LocalDateTime endDateTo;
    private Integer capacityMin;
    private Integer capacityMax;
    private Integer participantsMin;
    private Integer participantsMax;
    private Long userId;
    private String sortBy = "idEvent";
    private String sortDir = "desc";
    private int page = 0;
    private int size = 10;


    public String getTitleContains() { return titleContains; }
    public void setTitleContains(String titleContains) { this.titleContains = titleContains; }
    public String getLocationContains() { return locationContains; }
    public void setLocationContains(String locationContains) { this.locationContains = locationContains; }
    public String getDescriptionContains() { return descriptionContains; }
    public void setDescriptionContains(String descriptionContains) { this.descriptionContains = descriptionContains; }
    public EventStatus getStatus() { return status; }
    public void setStatus(EventStatus status) { this.status = status; }
    public CategoryEvent getCategory() { return category; }
    public void setCategory(CategoryEvent category) { this.category = category; }
    public LocalDateTime getStartDateFrom() { return startDateFrom; }
    public void setStartDateFrom(LocalDateTime startDateFrom) { this.startDateFrom = startDateFrom; }
    public LocalDateTime getStartDateTo() { return startDateTo; }
    public void setStartDateTo(LocalDateTime startDateTo) { this.startDateTo = startDateTo; }
    public LocalDateTime getEndDateFrom() { return endDateFrom; }
    public void setEndDateFrom(LocalDateTime endDateFrom) { this.endDateFrom = endDateFrom; }
    public LocalDateTime getEndDateTo() { return endDateTo; }
    public void setEndDateTo(LocalDateTime endDateTo) { this.endDateTo = endDateTo; }
    public Integer getCapacityMin() { return capacityMin; }
    public void setCapacityMin(Integer capacityMin) { this.capacityMin = capacityMin; }
    public Integer getCapacityMax() { return capacityMax; }
    public void setCapacityMax(Integer capacityMax) { this.capacityMax = capacityMax; }
    public Integer getParticipantsMin() { return participantsMin; }
    public void setParticipantsMin(Integer participantsMin) { this.participantsMin = participantsMin; }
    public Integer getParticipantsMax() { return participantsMax; }
    public void setParticipantsMax(Integer participantsMax) { this.participantsMax = participantsMax; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getSortBy() { return sortBy; }
    public void setSortBy(String sortBy) { this.sortBy = sortBy; }
    public String getSortDir() { return sortDir; }
    public void setSortDir(String sortDir) { this.sortDir = sortDir; }
    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }
}
