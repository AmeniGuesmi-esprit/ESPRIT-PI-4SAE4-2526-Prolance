package com.esprit.eventservice.services;

import com.esprit.eventservice.clients.ActivityClient;
import com.esprit.eventservice.clients.UserClient;
import com.esprit.eventservice.dto.*;
import com.esprit.eventservice.entities.CategoryEvent;
import com.esprit.eventservice.entities.Event;
import com.esprit.eventservice.entities.EventStatus;
import com.esprit.eventservice.repositories.EventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventServiceImplTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private UserClient userClient;

    @Mock
    private IGeocodingService geocodingService;

    @Mock
    private ActivityClient activityClient;

    @InjectMocks
    private EventServiceImpl eventService;

    // ── Fixtures ────────────────────────────────────────────────────────────

    private EventRequestDTO validRequest;
    private Event savedEvent;
    private UserDTO userDTO;

    @BeforeEach
    void setUp() {
        validRequest = new EventRequestDTO();
        validRequest.setTitle("Conférence DevOps");
        validRequest.setDescription("Description de l'événement");
        validRequest.setStartDate(LocalDateTime.of(2026, 6, 1, 9, 0));
        validRequest.setEndDate(LocalDateTime.of(2026, 6, 1, 18, 0));
        validRequest.setLocation("Tunis, Tunisie");
        validRequest.setCapacity(100);
        validRequest.setImageUrl(null);
        validRequest.setCategory(CategoryEvent.CONFERENCE);
        validRequest.setUserId(1L);
        validRequest.setActivities(null);

        savedEvent = new Event();
        savedEvent.setIdEvent(1L);
        savedEvent.setTitle("Conférence DevOps");
        savedEvent.setDescription("Description de l'événement");
        savedEvent.setStartDate(LocalDateTime.of(2026, 6, 1, 9, 0));
        savedEvent.setEndDate(LocalDateTime.of(2026, 6, 1, 18, 0));
        savedEvent.setLocation("Tunis, Tunisie");
        savedEvent.setCapacity(100);
        savedEvent.setCurrentParticipants(0);
        savedEvent.setEventStatus(EventStatus.PUBLISHED);
        savedEvent.setCategory(CategoryEvent.CONFERENCE);
        savedEvent.setUserId(1L);
        savedEvent.setArchived(false);
        savedEvent.setCreatedAt(LocalDateTime.now());
        savedEvent.setUpdatedAt(LocalDateTime.now());

        userDTO = new UserDTO();
        userDTO.setName("Yesmine");
        userDTO.setLastName("Chakroun");
    }

    // ════════════════════════════════════════════════════════════════════════
    // addEvent()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("addEvent - succès : retourne un EventResponseDTO correctement mappé")
    void addEvent_success() {
        when(userClient.getUserById(1)).thenReturn(userDTO);
        when(geocodingService.geocodeAddress("Tunis, Tunisie")).thenReturn(new double[]{36.8, 10.18});
        when(eventRepository.save(any(Event.class))).thenReturn(savedEvent);

        EventResponseDTO result = eventService.addEvent(validRequest);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Conférence DevOps");
        assertThat(result.getEventStatus()).isEqualTo(EventStatus.PUBLISHED);
        assertThat(result.getUserName()).isEqualTo("Yesmine Chakroun");
        verify(eventRepository, times(1)).save(any(Event.class));
    }

    @Test
    @DisplayName("addEvent - erreur : date de fin avant date de début → RuntimeException")
    void addEvent_endDateBeforeStartDate_throwsException() {
        validRequest.setEndDate(LocalDateTime.of(2026, 5, 1, 9, 0));

        assertThatThrownBy(() -> eventService.addEvent(validRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("date de fin");
    }

    @Test
    @DisplayName("addEvent - erreur : utilisateur introuvable → RuntimeException")
    void addEvent_userNotFound_throwsException() {
        when(userClient.getUserById(1)).thenReturn(null);

        assertThatThrownBy(() -> eventService.addEvent(validRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Utilisateur non trouvé");
    }

    @Test
    @DisplayName("addEvent - avec activités : appelle activityClient pour chaque activité")
    void addEvent_withActivities_callsActivityClient() {
        ActivityDTO act1 = new ActivityDTO();
        act1.setName("Workshop Git");
        ActivityDTO act2 = new ActivityDTO();
        act2.setName("Talk Kubernetes");
        validRequest.setActivities(List.of(act1, act2));

        when(userClient.getUserById(1)).thenReturn(userDTO);
        when(geocodingService.geocodeAddress(anyString())).thenReturn(null);
        when(eventRepository.save(any(Event.class))).thenReturn(savedEvent);

        eventService.addEvent(validRequest);

        verify(activityClient, times(2)).createActivity(any(ActivityDTO.class));
    }

    @Test
    @DisplayName("addEvent - géocodage échoue (retourne null) : event sauvegardé sans coordonnées")
    void addEvent_geocodingFails_eventSavedWithoutCoords() {
        when(userClient.getUserById(1)).thenReturn(userDTO);
        when(geocodingService.geocodeAddress(anyString())).thenReturn(null);
        when(eventRepository.save(any(Event.class))).thenReturn(savedEvent);

        EventResponseDTO result = eventService.addEvent(validRequest);

        assertThat(result).isNotNull();
        verify(eventRepository).save(argThat(e -> e.getLatitude() == null));
    }

    // ════════════════════════════════════════════════════════════════════════
    // updateEvent()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("updateEvent - succès : met à jour les champs et retourne le DTO")
    void updateEvent_success() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(eventRepository.save(any(Event.class))).thenReturn(savedEvent);
        when(userClient.getUserById(1)).thenReturn(userDTO);
        when(geocodingService.geocodeAddress(anyString())).thenReturn(null);

        EventResponseDTO result = eventService.updateEvent(1L, validRequest);

        assertThat(result).isNotNull();
        assertThat(result.getIdEvent()).isEqualTo(1L);
        verify(eventRepository).save(any(Event.class));
    }

    @Test
    @DisplayName("updateEvent - erreur : événement introuvable → RuntimeException")
    void updateEvent_eventNotFound_throwsException() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.updateEvent(99L, validRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Événement non trouvé");
    }

    @Test
    @DisplayName("updateEvent - erreur : date de fin invalide → RuntimeException")
    void updateEvent_invalidDates_throwsException() {
        validRequest.setEndDate(validRequest.getStartDate().minusDays(1));

        assertThatThrownBy(() -> eventService.updateEvent(1L, validRequest))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("date de fin");
    }

    @Test
    @DisplayName("updateEvent - avec activités : supprime les anciennes puis recrée les nouvelles")
    void updateEvent_withActivities_deletesOldAndCreatesNew() {
        ActivityDTO act = new ActivityDTO();
        act.setName("New Activity");
        validRequest.setActivities(List.of(act));

        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(eventRepository.save(any(Event.class))).thenReturn(savedEvent);
        when(userClient.getUserById(anyInt())).thenReturn(userDTO);
        when(geocodingService.geocodeAddress(anyString())).thenReturn(null);

        eventService.updateEvent(1L, validRequest);

        verify(activityClient).deleteActivitiesByEventId(1L);
        verify(activityClient).createActivity(any(ActivityDTO.class));
    }

    // ════════════════════════════════════════════════════════════════════════
    // getEventById()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("getEventById - succès : retourne le bon événement")
    void getEventById_success() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(userClient.getUserById(1)).thenReturn(userDTO);

        EventResponseDTO result = eventService.getEventById(1L);

        assertThat(result.getIdEvent()).isEqualTo(1L);
        assertThat(result.getTitle()).isEqualTo("Conférence DevOps");
    }

    @Test
    @DisplayName("getEventById - erreur : événement introuvable → RuntimeException")
    void getEventById_notFound_throwsException() {
        when(eventRepository.findById(42L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.getEventById(42L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Événement non trouvé");
    }

    // ════════════════════════════════════════════════════════════════════════
    // getAllEvents()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("getAllEvents - retourne uniquement les événements non archivés")
    void getAllEvents_returnsOnlyNonArchived() {
        when(eventRepository.findByArchivedFalse()).thenReturn(List.of(savedEvent));
        when(userClient.getUserById(anyInt())).thenReturn(userDTO);

        List<EventResponseDTO> result = eventService.getAllEvents();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).isArchived()).isFalse();
    }

    @Test
    @DisplayName("getAllEvents - liste vide si aucun événement actif")
    void getAllEvents_empty() {
        when(eventRepository.findByArchivedFalse()).thenReturn(List.of());

        List<EventResponseDTO> result = eventService.getAllEvents();

        assertThat(result).isEmpty();
    }

    // ════════════════════════════════════════════════════════════════════════
    // archiveEvent() / restoreEvent()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("archiveEvent - succès : archived passe à true")
    void archiveEvent_success() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(eventRepository.save(any(Event.class))).thenReturn(savedEvent);

        eventService.archiveEvent(1L);

        verify(eventRepository).save(argThat(Event::isArchived));
    }

    @Test
    @DisplayName("archiveEvent - erreur : événement introuvable → RuntimeException")
    void archiveEvent_notFound_throwsException() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.archiveEvent(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Événement non trouvé");
    }

    @Test
    @DisplayName("restoreEvent - succès : archived passe à false")
    void restoreEvent_success() {
        savedEvent.setArchived(true);
        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(eventRepository.save(any(Event.class))).thenReturn(savedEvent);

        eventService.restoreEvent(1L);

        verify(eventRepository).save(argThat(e -> !e.isArchived()));
    }

    @Test
    @DisplayName("restoreEvent - erreur : événement introuvable → RuntimeException")
    void restoreEvent_notFound_throwsException() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> eventService.restoreEvent(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Événement non trouvé");
    }

    // ════════════════════════════════════════════════════════════════════════
    // getArchivedEvents()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("getArchivedEvents - retourne uniquement les événements archivés")
    void getArchivedEvents_returnsOnlyArchived() {
        savedEvent.setArchived(true);
        when(eventRepository.findByArchivedTrue()).thenReturn(List.of(savedEvent));
        when(userClient.getUserById(anyInt())).thenReturn(userDTO);

        List<EventResponseDTO> result = eventService.getArchivedEvents();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).isArchived()).isTrue();
    }

    // ════════════════════════════════════════════════════════════════════════
    // filterEvents()
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("filterEvents - retourne une PageResponseDTO avec le bon contenu")
    void filterEvents_returnsPaginatedResult() {
        EventFilterDTO filter = new EventFilterDTO();
        filter.setPage(0);
        filter.setSize(10);
        filter.setSortBy("idEvent");
        filter.setSortDir("asc");

        Page<Event> page = new PageImpl<>(List.of(savedEvent));
        when(eventRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(eventRepository.count()).thenReturn(1L);
        when(userClient.getUserById(anyInt())).thenReturn(userDTO);

        PageResponseDTO<EventResponseDTO> result = eventService.filterEvents(filter);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1L);
        assertThat(result.getCurrentPage()).isZero();
    }

    @Test
    @DisplayName("filterEvents - champ de tri invalide : utilise 'idEvent' par défaut")
    void filterEvents_invalidSortField_usesDefaultSort() {
        EventFilterDTO filter = new EventFilterDTO();
        filter.setPage(0);
        filter.setSize(10);
        filter.setSortBy("champInvalide");
        filter.setSortDir("desc");

        Page<Event> page = new PageImpl<>(List.of());
        when(eventRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(eventRepository.count()).thenReturn(0L);

        PageResponseDTO<EventResponseDTO> result = eventService.filterEvents(filter);

        assertThat(result.getSortBy()).isEqualTo("idEvent");
    }

    @Test
    @DisplayName("filterEvents - taille limitée à 100 maximum")
    void filterEvents_sizeClampedTo100() {
        EventFilterDTO filter = new EventFilterDTO();
        filter.setPage(0);
        filter.setSize(999);
        filter.setSortBy("idEvent");
        filter.setSortDir("asc");

        Page<Event> page = new PageImpl<>(List.of());
        when(eventRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(eventRepository.count()).thenReturn(0L);

        eventService.filterEvents(filter);

        verify(eventRepository).findAll(
                any(Specification.class),
                argThat((Pageable p) -> p.getPageSize() == 100)
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // Robustesse : userClient en échec (fetchUserSafely)
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("getEventById - userClient en échec : retourne le DTO sans nom d'utilisateur")
    void getEventById_userClientFails_returnsEventWithoutUserName() {
        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(userClient.getUserById(anyInt())).thenThrow(new RuntimeException("Service indisponible"));

        EventResponseDTO result = eventService.getEventById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getUserName()).isNull();
    }

    // ════════════════════════════════════════════════════════════════════════
    // geocodeAllExistingEvents()  ← NOUVEAUX TESTS
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("geocodeAllExistingEvents - liste vide : aucun appel geocoding")
    void geocodeAllExistingEvents_emptyList() {
        when(eventRepository.findByLatitudeIsNull()).thenReturn(List.of());

        eventService.geocodeAllExistingEvents();

        verify(geocodingService, never()).geocodeAddress(any());
    }

    @Test
    @DisplayName("geocodeAllExistingEvents - avec événements : appelle geocoding pour chaque event")
    void geocodeAllExistingEvents_withEvents() {
        savedEvent.setLocation("Tunis");
        when(eventRepository.findByLatitudeIsNull()).thenReturn(List.of(savedEvent));

        eventService.geocodeAllExistingEvents();

        verify(geocodingService).geocodeAddress("Tunis");
    }

    @Test
    @DisplayName("geocodeAllExistingEvents - event sans location : geocoding ignoré")
    void geocodeAllExistingEvents_eventWithNullLocation_skipsGeocoding() {
        savedEvent.setLocation(null);
        when(eventRepository.findByLatitudeIsNull()).thenReturn(List.of(savedEvent));

        eventService.geocodeAllExistingEvents();

        verify(geocodingService, never()).geocodeAddress(any());
    }

    // ════════════════════════════════════════════════════════════════════════
    // applyGeocoding() — branche location null/blank  ← NOUVEAUX TESTS
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("addEvent - location null : geocoding non appelé")
    void addEvent_nullLocation_noGeocoding() {
        validRequest.setLocation(null);
        when(userClient.getUserById(1)).thenReturn(userDTO);
        when(eventRepository.save(any())).thenReturn(savedEvent);

        eventService.addEvent(validRequest);

        verify(geocodingService, never()).geocodeAddress(any());
    }

    @Test
    @DisplayName("addEvent - location blank : geocoding non appelé")
    void addEvent_blankLocation_noGeocoding() {
        validRequest.setLocation("   ");
        when(userClient.getUserById(1)).thenReturn(userDTO);
        when(eventRepository.save(any())).thenReturn(savedEvent);

        eventService.addEvent(validRequest);

        verify(geocodingService, never()).geocodeAddress(any());
    }

    // ════════════════════════════════════════════════════════════════════════
    // createActivities() — catch Exception  ← NOUVEAUX TESTS
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("addEvent - activityClient en échec : ne lève pas d'exception")
    void addEvent_activityClientFails_doesNotThrow() {
        ActivityDTO act = new ActivityDTO();
        act.setName("Test");
        validRequest.setActivities(List.of(act));

        when(userClient.getUserById(1)).thenReturn(userDTO);
        when(geocodingService.geocodeAddress(any())).thenReturn(null);
        when(eventRepository.save(any())).thenReturn(savedEvent);
        doThrow(new RuntimeException("Feign error"))
                .when(activityClient).createActivity(any());

        assertThatCode(() -> eventService.addEvent(validRequest))
                .doesNotThrowAnyException();
    }

    // ════════════════════════════════════════════════════════════════════════
    // deleteActivitiesSafely() — catch Exception  ← NOUVEAUX TESTS
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("updateEvent - deleteActivities en échec : ne lève pas d'exception")
    void updateEvent_deleteActivitiesFails_doesNotThrow() {
        ActivityDTO act = new ActivityDTO();
        act.setName("Act");
        validRequest.setActivities(List.of(act));

        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(eventRepository.save(any())).thenReturn(savedEvent);
        when(userClient.getUserById(anyInt())).thenReturn(userDTO);
        when(geocodingService.geocodeAddress(any())).thenReturn(null);
        doThrow(new RuntimeException("Feign error"))
                .when(activityClient).deleteActivitiesByEventId(any());

        assertThatCode(() -> eventService.updateEvent(1L, validRequest))
                .doesNotThrowAnyException();
    }

    // ════════════════════════════════════════════════════════════════════════
    // updateLocationIfChanged()  ← NOUVEAUX TESTS
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("updateEvent - location blank : geocoding non appelé")
    void updateEvent_blankLocation_noGeocoding() {
        validRequest.setLocation("   ");
        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(eventRepository.save(any())).thenReturn(savedEvent);
        when(userClient.getUserById(anyInt())).thenReturn(userDTO);

        eventService.updateEvent(1L, validRequest);

        verify(geocodingService, never()).geocodeAddress(any());
    }

    @Test
    @DisplayName("updateEvent - location inchangée mais latitude null : geocoding appelé quand même")
    void updateEvent_sameLocationButLatitudeNull_triggersGeocoding() {
        savedEvent.setLocation("Tunis, Tunisie");
        savedEvent.setLatitude(null);

        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(eventRepository.save(any())).thenReturn(savedEvent);
        when(userClient.getUserById(anyInt())).thenReturn(userDTO);
        when(geocodingService.geocodeAddress("Tunis, Tunisie")).thenReturn(new double[]{36.8, 10.18});

        eventService.updateEvent(1L, validRequest);

        verify(geocodingService).geocodeAddress("Tunis, Tunisie");
    }

    @Test
    @DisplayName("updateEvent - location null : geocoding non appelé")
    void updateEvent_nullLocation_noGeocoding() {
        validRequest.setLocation(null);
        when(eventRepository.findById(1L)).thenReturn(Optional.of(savedEvent));
        when(eventRepository.save(any())).thenReturn(savedEvent);
        when(userClient.getUserById(anyInt())).thenReturn(userDTO);

        eventService.updateEvent(1L, validRequest);

        verify(geocodingService, never()).geocodeAddress(any());
    }
}