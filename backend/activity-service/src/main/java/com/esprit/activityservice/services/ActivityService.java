package com.esprit.activityservice.services;

import com.esprit.activityservice.clients.EventClient;
import com.esprit.activityservice.dto.ActivityRequestDTO;
import com.esprit.activityservice.dto.ActivityResponseDTO;
import com.esprit.activityservice.dto.EventDTO;
import com.esprit.activityservice.entities.Activity;
import com.esprit.activityservice.repositories.ActivityRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final EventClient eventClient;

    public ActivityService(ActivityRepository activityRepository, EventClient eventClient) {
        this.activityRepository = activityRepository;
        this.eventClient = eventClient;
    }

    public ActivityResponseDTO addActivity(ActivityRequestDTO dto) {
        // Verify event exists via Feign
        EventDTO event = eventClient.getEventById(dto.getEventId());
        if (event == null) {
            throw new RuntimeException("Événement non trouvé: " + dto.getEventId());
        }

        Activity activity = new Activity();
        activity.setName(dto.getName());
        activity.setDescription(dto.getDescription());
        activity.setRequirements(dto.getRequirements());
        activity.setEventId(dto.getEventId());

        Activity saved = activityRepository.save(activity);
        return mapToResponse(saved, event);
    }

    public ActivityResponseDTO updateActivity(Long id, ActivityRequestDTO dto) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité non trouvée: " + id));

        activity.setName(dto.getName());
        activity.setDescription(dto.getDescription());
        activity.setRequirements(dto.getRequirements());
        if (dto.getEventId() != null) {
            activity.setEventId(dto.getEventId());
        }

        Activity updated = activityRepository.save(activity);
        EventDTO event = fetchEventSafely(updated.getEventId());
        return mapToResponse(updated, event);
    }

    public void deleteActivity(Long id) {
        if (!activityRepository.existsById(id)) {
            throw new RuntimeException("Activité non trouvée: " + id);
        }
        activityRepository.deleteById(id);
    }

    @Transactional
    public void deleteActivitiesByEventId(Long eventId) {
        activityRepository.deleteByEventId(eventId);
    }

    public ActivityResponseDTO getActivityById(Long id) {
        Activity activity = activityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité non trouvée: " + id));
        EventDTO event = fetchEventSafely(activity.getEventId());
        return mapToResponse(activity, event);
    }

    public List<ActivityResponseDTO> getAllActivities() {
        return activityRepository.findAll().stream()
                .map(a -> mapToResponse(a, fetchEventSafely(a.getEventId())))
                .collect(Collectors.toList());
    }

    public List<ActivityResponseDTO> getActivitiesByEventId(Long eventId) {
        return activityRepository.findByEventId(eventId).stream()
                .map(a -> mapToResponse(a, fetchEventSafely(a.getEventId())))
                .collect(Collectors.toList());
    }

    private EventDTO fetchEventSafely(Long eventId) {
        if (eventId == null) return null;
        try {
            return eventClient.getEventById(eventId);
        } catch (Exception e) {
            return null;
        }
    }

    private ActivityResponseDTO mapToResponse(Activity activity, EventDTO event) {
        ActivityResponseDTO dto = new ActivityResponseDTO();
        dto.setIdActivity(activity.getIdActivity());
        dto.setName(activity.getName());
        dto.setDescription(activity.getDescription());
        dto.setRequirements(activity.getRequirements());
        dto.setEventId(activity.getEventId());
        if (event != null) {
            dto.setEventTitle(event.getTitle());
            dto.setEventLocation(event.getLocation());
        }
        return dto;
    }
}
