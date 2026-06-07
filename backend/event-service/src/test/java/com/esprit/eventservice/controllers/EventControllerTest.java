package com.esprit.eventservice.controllers;

import com.esprit.eventservice.dto.*;
import com.esprit.eventservice.entities.CategoryEvent;
import com.esprit.eventservice.entities.EventStatus;
import com.esprit.eventservice.services.IEventService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class EventControllerTest {

    @Mock
    private IEventService eventService;

    @InjectMocks
    private EventController eventController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private EventRequestDTO validRequest;
    private EventResponseDTO sampleResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(eventController).build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        validRequest = new EventRequestDTO();
        validRequest.setTitle("Conférence DevOps");
        validRequest.setDescription("Description de l'événement");
        validRequest.setStartDate(LocalDateTime.of(2026, 6, 1, 9, 0));
        validRequest.setEndDate(LocalDateTime.of(2026, 6, 1, 18, 0));
        validRequest.setLocation("Tunis, Tunisie");
        validRequest.setCapacity(100);
        validRequest.setCategory(CategoryEvent.CONFERENCE);
        validRequest.setUserId(1L);

        sampleResponse = new EventResponseDTO();
        sampleResponse.setIdEvent(1L);
        sampleResponse.setTitle("Conférence DevOps");
        sampleResponse.setDescription("Description de l'événement");
        sampleResponse.setStartDate(LocalDateTime.of(2026, 6, 1, 9, 0));
        sampleResponse.setEndDate(LocalDateTime.of(2026, 6, 1, 18, 0));
        sampleResponse.setLocation("Tunis, Tunisie");
        sampleResponse.setCapacity(100);
        sampleResponse.setCurrentParticipants(0);
        sampleResponse.setEventStatus(EventStatus.PUBLISHED);
        sampleResponse.setCategory(CategoryEvent.CONFERENCE);
        sampleResponse.setUserId(1L);
        sampleResponse.setArchived(false);
        sampleResponse.setUserName("Yesmine Chakroun");
    }

    // ════════════════════════════════════════════════════════════════════════
    // POST /api/events  →  addEvent()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("POST /api/events - succès : retourne 201 CREATED avec le DTO")
    void addEvent_returns201() throws Exception {
        when(eventService.addEvent(any(EventRequestDTO.class))).thenReturn(sampleResponse);

        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idEvent").value(1L))
                .andExpect(jsonPath("$.title").value("Conférence DevOps"));

        verify(eventService, times(1)).addEvent(any(EventRequestDTO.class));
    }

    // ════════════════════════════════════════════════════════════════════════
    // PUT /api/events/{id}  →  updateEvent()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("PUT /api/events/1 - succès : retourne 200 OK avec le DTO mis à jour")
    void updateEvent_returns200() throws Exception {
        when(eventService.updateEvent(eq(1L), any(EventRequestDTO.class))).thenReturn(sampleResponse);

        mockMvc.perform(put("/api/events/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idEvent").value(1L));

        verify(eventService, times(1)).updateEvent(eq(1L), any(EventRequestDTO.class));
    }

    // ════════════════════════════════════════════════════════════════════════
    // GET /api/events/{id}  →  getEvent()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GET /api/events/1 - succès : retourne 200 OK avec l'événement")
    void getEvent_returns200() throws Exception {
        when(eventService.getEventById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/events/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Conférence DevOps"))
                .andExpect(jsonPath("$.userName").value("Yesmine Chakroun"));

        verify(eventService).getEventById(1L);
    }

    // ════════════════════════════════════════════════════════════════════════
    // GET /api/events  →  getAllEvents()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GET /api/events - succès : retourne 200 OK avec la liste")
    void getAllEvents_returns200() throws Exception {
        when(eventService.getAllEvents()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].idEvent").value(1L));

        verify(eventService).getAllEvents();
    }

    @Test
    @DisplayName("GET /api/events - liste vide : retourne 200 OK avec tableau vide")
    void getAllEvents_empty_returns200() throws Exception {
        when(eventService.getAllEvents()).thenReturn(List.of());

        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ════════════════════════════════════════════════════════════════════════
    // DELETE /api/events/{id}  →  archiveEvent()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("DELETE /api/events/1 - succès : retourne 204 NO CONTENT")
    void archiveEvent_returns204() throws Exception {
        doNothing().when(eventService).archiveEvent(1L);

        mockMvc.perform(delete("/api/events/1"))
                .andExpect(status().isNoContent());

        verify(eventService).archiveEvent(1L);
    }

    // ════════════════════════════════════════════════════════════════════════
    // GET /api/events/archived  →  getArchivedEvents()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GET /api/events/archived - succès : retourne 200 OK avec les archivés")
    void getArchivedEvents_returns200() throws Exception {
        sampleResponse.setArchived(true);
        when(eventService.getArchivedEvents()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/events/archived"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].archived").value(true));

        verify(eventService).getArchivedEvents();
    }

    // ════════════════════════════════════════════════════════════════════════
    // PUT /api/events/{id}/restore  →  restoreEvent()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("PUT /api/events/1/restore - succès : retourne 204 NO CONTENT")
    void restoreEvent_returns204() throws Exception {
        doNothing().when(eventService).restoreEvent(1L);

        mockMvc.perform(put("/api/events/1/restore"))
                .andExpect(status().isNoContent());

        verify(eventService).restoreEvent(1L);
    }

    // ════════════════════════════════════════════════════════════════════════
    // GET /api/events/filter  →  filterEvents()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GET /api/events/filter - sans paramètres : utilise les valeurs par défaut")
    void filterEvents_noParams_usesDefaults() throws Exception {
        PageResponseDTO<EventResponseDTO> page = new PageResponseDTO<>();
        page.setContent(List.of(sampleResponse));
        page.setCurrentPage(0);
        page.setTotalElements(1L);
        page.setTotalPages(1);
        page.setPageSize(10);
        when(eventService.filterEvents(any(EventFilterDTO.class))).thenReturn(page);

        mockMvc.perform(get("/api/events/filter"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentPage").value(0))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(eventService).filterEvents(any(EventFilterDTO.class));
    }

    @Test
    @DisplayName("GET /api/events/filter - status valide : filtre appliqué")
    void filterEvents_withValidStatus() throws Exception {
        PageResponseDTO<EventResponseDTO> page = new PageResponseDTO<>();
        page.setContent(List.of());
        page.setCurrentPage(0);
        page.setTotalElements(0L);
        when(eventService.filterEvents(any(EventFilterDTO.class))).thenReturn(page);

        mockMvc.perform(get("/api/events/filter")
                        .param("status", "PUBLISHED")
                        .param("page", "0")
                        .param("size", "5"))
                .andExpect(status().isOk());

        verify(eventService).filterEvents(argThat(f -> f.getStatus() == EventStatus.PUBLISHED));
    }

    @Test
    @DisplayName("GET /api/events/filter - status invalide : ignoré (pas de filtre status)")
    void filterEvents_withInvalidStatus_ignored() throws Exception {
        PageResponseDTO<EventResponseDTO> page = new PageResponseDTO<>();
        page.setContent(List.of());
        page.setTotalElements(0L);
        when(eventService.filterEvents(any(EventFilterDTO.class))).thenReturn(page);

        // Should not throw; invalid status is silently ignored in the controller
        mockMvc.perform(get("/api/events/filter").param("status", "INVALID_VALUE"))
                .andExpect(status().isOk());

        verify(eventService).filterEvents(argThat(f -> f.getStatus() == null));
    }

    @Test
    @DisplayName("GET /api/events/filter - category valide : filtre appliqué")
    void filterEvents_withValidCategory() throws Exception {
        PageResponseDTO<EventResponseDTO> page = new PageResponseDTO<>();
        page.setContent(List.of());
        page.setTotalElements(0L);
        when(eventService.filterEvents(any(EventFilterDTO.class))).thenReturn(page);

        mockMvc.perform(get("/api/events/filter").param("category", "CONFERENCE"))
                .andExpect(status().isOk());

        verify(eventService).filterEvents(argThat(f -> f.getCategory() == CategoryEvent.CONFERENCE));
    }

    @Test
    @DisplayName("GET /api/events/filter - category invalide : ignorée (pas de filtre category)")
    void filterEvents_withInvalidCategory_ignored() throws Exception {
        PageResponseDTO<EventResponseDTO> page = new PageResponseDTO<>();
        page.setContent(List.of());
        page.setTotalElements(0L);
        when(eventService.filterEvents(any(EventFilterDTO.class))).thenReturn(page);

        mockMvc.perform(get("/api/events/filter").param("category", "NOT_A_CATEGORY"))
                .andExpect(status().isOk());

        verify(eventService).filterEvents(argThat(f -> f.getCategory() == null));
    }

    @Test
    @DisplayName("GET /api/events/filter - tous les paramètres : mappés dans le DTO filtre")
    void filterEvents_allParams_mappedCorrectly() throws Exception {
        PageResponseDTO<EventResponseDTO> page = new PageResponseDTO<>();
        page.setContent(List.of());
        page.setTotalElements(0L);
        when(eventService.filterEvents(any(EventFilterDTO.class))).thenReturn(page);

        mockMvc.perform(get("/api/events/filter")
                        .param("titleContains", "DevOps")
                        .param("locationContains", "Tunis")
                        .param("descriptionContains", "desc")
                        .param("status", "PUBLISHED")
                        .param("category", "CONFERENCE")
                        .param("capacityMin", "10")
                        .param("capacityMax", "200")
                        .param("participantsMin", "0")
                        .param("participantsMax", "50")
                        .param("userId", "1")
                        .param("sortBy", "title")
                        .param("sortDir", "asc")
                        .param("page", "1")
                        .param("size", "20"))
                .andExpect(status().isOk());

        verify(eventService).filterEvents(argThat(f ->
                "DevOps".equals(f.getTitleContains())
                        && "Tunis".equals(f.getLocationContains())
                        && f.getCapacityMin() == 10
                        && f.getCapacityMax() == 200
                        && f.getPage() == 1
                        && f.getSize() == 20
        ));
    }
}
