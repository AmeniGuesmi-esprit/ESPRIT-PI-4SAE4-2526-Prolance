package com.esprit.eventservice.controllers;

import com.esprit.eventservice.dto.*;
import com.esprit.eventservice.entities.CategoryEvent;
import com.esprit.eventservice.entities.EventStatus;
import com.esprit.eventservice.services.IEventService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/events")

public class EventController {

    private final IEventService eventService;

    public EventController(IEventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<EventResponseDTO> addEvent(@Valid @RequestBody EventRequestDTO dto) {
        return new ResponseEntity<>(eventService.addEvent(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventResponseDTO> updateEvent(@PathVariable Long id,
                                                         @Valid @RequestBody EventRequestDTO dto) {
        return ResponseEntity.ok(eventService.updateEvent(id, dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponseDTO> getEvent(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    @GetMapping
    public ResponseEntity<List<EventResponseDTO>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> archiveEvent(@PathVariable Long id) {
        eventService.archiveEvent(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/archived")
    public ResponseEntity<List<EventResponseDTO>> getArchivedEvents() {
        return ResponseEntity.ok(eventService.getArchivedEvents());
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<Void> restoreEvent(@PathVariable Long id) {
        eventService.restoreEvent(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/filter")
    public ResponseEntity<PageResponseDTO<EventResponseDTO>> filterEvents(
            @RequestParam(required = false) String titleContains,
            @RequestParam(required = false) String locationContains,
            @RequestParam(required = false) String descriptionContains,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDateTo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDateTo,
            @RequestParam(required = false) Integer capacityMin,
            @RequestParam(required = false) Integer capacityMax,
            @RequestParam(required = false) Integer participantsMin,
            @RequestParam(required = false) Integer participantsMax,
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "idEvent") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        EventFilterDTO filter = new EventFilterDTO();
        filter.setTitleContains(titleContains);
        filter.setLocationContains(locationContains);
        filter.setDescriptionContains(descriptionContains);
        if (status != null) {
            try {
                filter.setStatus(EventStatus.valueOf(status.toUpperCase()));
            } catch (IllegalArgumentException e) {
                // Invalid status value ignored, no filter applied
            }
        }
        if (category != null) {
            try {
                filter.setCategory(CategoryEvent.valueOf(category.toUpperCase()));
            } catch (IllegalArgumentException e) {
                // Invalid category value ignored, no filter applied
            }
        }
        filter.setStartDateFrom(startDateFrom);
        filter.setStartDateTo(startDateTo);
        filter.setEndDateFrom(endDateFrom);
        filter.setEndDateTo(endDateTo);
        filter.setCapacityMin(capacityMin);
        filter.setCapacityMax(capacityMax);
        filter.setParticipantsMin(participantsMin);
        filter.setParticipantsMax(participantsMax);
        filter.setUserId(userId);
        filter.setSortBy(sortBy);
        filter.setSortDir(sortDir);
        filter.setPage(page);
        filter.setSize(size);

        return ResponseEntity.ok(eventService.filterEvents(filter));
    }
}
