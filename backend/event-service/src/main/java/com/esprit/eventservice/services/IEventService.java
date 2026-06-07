package com.esprit.eventservice.services;

import com.esprit.eventservice.dto.*;

import java.util.List;

public interface IEventService {
    EventResponseDTO addEvent(EventRequestDTO dto);
    EventResponseDTO updateEvent(Long id, EventRequestDTO dto);
    EventResponseDTO getEventById(Long id);
    List<EventResponseDTO> getAllEvents();
    void archiveEvent(Long id);
    List<EventResponseDTO> getArchivedEvents();
    void restoreEvent(Long id);
    void geocodeAllExistingEvents();
    PageResponseDTO<EventResponseDTO> filterEvents(EventFilterDTO filter);
}
