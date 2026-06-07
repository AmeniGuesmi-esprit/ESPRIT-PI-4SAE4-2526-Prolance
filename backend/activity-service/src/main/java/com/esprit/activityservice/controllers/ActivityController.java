package com.esprit.activityservice.controllers;

import com.esprit.activityservice.dto.ActivityRequestDTO;
import com.esprit.activityservice.dto.ActivityResponseDTO;
import com.esprit.activityservice.services.ActivityService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities")

public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @PostMapping
    public ResponseEntity<ActivityResponseDTO> createActivity(@Valid @RequestBody ActivityRequestDTO dto) {
        return new ResponseEntity<>(activityService.addActivity(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActivityResponseDTO> updateActivity(@PathVariable Long id,
                                                               @Valid @RequestBody ActivityRequestDTO dto) {
        return ResponseEntity.ok(activityService.updateActivity(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActivity(@PathVariable Long id) {
        activityService.deleteActivity(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityResponseDTO> getActivityById(@PathVariable Long id) {
        return ResponseEntity.ok(activityService.getActivityById(id));
    }

    @GetMapping
    public ResponseEntity<List<ActivityResponseDTO>> getAllActivities() {
        return ResponseEntity.ok(activityService.getAllActivities());
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<ActivityResponseDTO>> getActivitiesByEventId(@PathVariable Long eventId) {
        return ResponseEntity.ok(activityService.getActivitiesByEventId(eventId));
    }

    @DeleteMapping("/event/{eventId}")
    public ResponseEntity<Void> deleteByEventId(@PathVariable Long eventId) {
        activityService.deleteActivitiesByEventId(eventId);
        return ResponseEntity.noContent().build();
    }
}
