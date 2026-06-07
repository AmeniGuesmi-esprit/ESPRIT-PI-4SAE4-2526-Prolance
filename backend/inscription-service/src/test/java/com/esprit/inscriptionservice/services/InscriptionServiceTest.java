package com.esprit.inscriptionservice.services;

import com.esprit.inscriptionservice.clients.EventClient;
import com.esprit.inscriptionservice.clients.UserClient;
import com.esprit.inscriptionservice.dto.*;
import com.esprit.inscriptionservice.entities.EventInscription;
import com.esprit.inscriptionservice.entities.InscriptionStatus;
import com.esprit.inscriptionservice.exceptions.BadgeGenerationException;
import com.esprit.inscriptionservice.repositories.InscriptionRepository;
import feign.FeignException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;


import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InscriptionServiceTest {

    @Mock private InscriptionRepository inscriptionRepository;
    @Mock private EventClient eventClient;
    @Mock private UserClient userClient;
    @Mock private BadgeGeneratorService badgeGeneratorService;
    @Mock private EmailService emailService;

    @InjectMocks
    private InscriptionService inscriptionService;

    private EventDTO event;
    private UserDTO user;
    private EventInscription inscription;
    private InscriptionRequestDTO request;

    @BeforeEach
    void setUp() {
        event = new EventDTO();
        event.setIdEvent(1L);
        event.setTitle("Conférence DevOps");
        event.setLocation("Salle A");
        event.setStartDate(LocalDateTime.now().plusDays(10));
        event.setCapacity(100);

        user = new UserDTO();
        user.setId(1);
        user.setName("Marah");
        user.setLastName("Yesmine");
        user.setEmail("yesmine.marah@email.com");

        inscription = new EventInscription();
        inscription.setId(1L);
        inscription.setParticipantNom("Marah");
        inscription.setParticipantPrenom("Yesmine");
        inscription.setParticipantEmail("yesmine.marah@email.com");
        inscription.setUserId(1L);
        inscription.setEventId(1L);
        inscription.setStatus(InscriptionStatus.PENDING);
        inscription.setRegistrationDate(LocalDateTime.now());

        request = new InscriptionRequestDTO();
        request.setParticipantNom("Marah");
        request.setParticipantPrenom("Yesmine");
        request.setParticipantEmail("yesmine.marah@email.com");
        request.setUserId(1L);
        request.setEventId(1L);
    }

    // ==================== submitInscription ====================

    @Test
    void submitInscription_shouldSucceed_whenValid() {
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.existsByUserIdAndEventId(1L, 1L)).thenReturn(false);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.ACCEPTED)).thenReturn(0L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.PROMOTED)).thenReturn(0L);
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);

        InscriptionResponseDTO result = inscriptionService.submitInscription(request);

        assertThat(result)
                .extracting(InscriptionResponseDTO::getStatus, InscriptionResponseDTO::getEventId)
                .containsExactly(InscriptionStatus.PENDING, 1L);
        verify(inscriptionRepository).save(any(EventInscription.class));
    }

    @Test
    void submitInscription_shouldPutOnWaitlist_whenEventFull() {
        event.setCapacity(1);
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.existsByUserIdAndEventId(1L, 1L)).thenReturn(false);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.ACCEPTED)).thenReturn(1L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.PROMOTED)).thenReturn(0L);
        when(inscriptionRepository.save(any(EventInscription.class))).thenAnswer(inv -> inv.getArgument(0));

        InscriptionResponseDTO result = inscriptionService.submitInscription(request);

        assertThat(result.getStatus()).isEqualTo(InscriptionStatus.WAITLIST);
    }

    @Test
    void submitInscription_shouldThrow_whenEventNotFound() {
        when(eventClient.getEventById(1L)).thenReturn(null);

        assertThatThrownBy(() -> inscriptionService.submitInscription(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Événement introuvable");
    }

    @Test
    void submitInscription_shouldThrow_whenUserNotFound() {
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(null);

        assertThatThrownBy(() -> inscriptionService.submitInscription(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Utilisateur introuvable");
    }

    @Test
    void submitInscription_shouldThrow_whenDeadlinePassed() {
        event.setStartDate(LocalDateTime.now().minusHours(1));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);

        assertThatThrownBy(() -> inscriptionService.submitInscription(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("fermées");
    }

    @Test
    void submitInscription_shouldThrow_whenAlreadyRegistered() {
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.existsByUserIdAndEventId(1L, 1L)).thenReturn(true);

        assertThatThrownBy(() -> inscriptionService.submitInscription(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("déjà soumis");
    }

    @Test
    void submitInscription_shouldUseUserEmail_whenRequestEmailIsNull() {
        request.setParticipantEmail(null); // couvre resolveEmail → user.getEmail()
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.existsByUserIdAndEventId(1L, 1L)).thenReturn(false);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.ACCEPTED)).thenReturn(0L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.PROMOTED)).thenReturn(0L);
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);

        InscriptionResponseDTO result = inscriptionService.submitInscription(request);

        assertThat(result).isNotNull();
    }

    // ==================== acceptInscription ====================

    @Test
    void acceptInscription_shouldAcceptAndGenerateBadge() {
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(badgeGeneratorService.generateBadge(any(), any())).thenReturn("badges/badge_1.png");
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);
        doNothing().when(emailService).sendAcceptanceEmail(anyString(), anyString(), anyString(), anyString());

        InscriptionResponseDTO result = inscriptionService.acceptInscription(1L);

        assertThat(result.getStatus()).isEqualTo(InscriptionStatus.ACCEPTED);
        verify(badgeGeneratorService).generateBadge(any(), any());
    }

    @Test
    void acceptInscription_shouldThrow_whenNotFound() {
        when(inscriptionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inscriptionService.acceptInscription(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Inscription introuvable");
    }

    @Test
    void acceptInscription_shouldThrow_whenAlreadyProcessed() {
        inscription.setStatus(InscriptionStatus.ACCEPTED);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));

        assertThatThrownBy(() -> inscriptionService.acceptInscription(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("déjà été traitée");
    }

    @Test
    void acceptInscription_shouldNotThrow_whenEmailFails() {
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(badgeGeneratorService.generateBadge(any(), any())).thenReturn("badges/badge_1.png");
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);
        doThrow(new MailSendException("SMTP error"))
                .when(emailService).sendAcceptanceEmail(anyString(), anyString(), anyString(), anyString());

        InscriptionResponseDTO result = inscriptionService.acceptInscription(1L);

        assertThat(result).isNotNull();
    }

    @Test
    void acceptInscription_shouldSkipEmail_whenEmailIsNull() {

        inscription.setParticipantEmail(null);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(null); // user null → email null
        when(badgeGeneratorService.generateBadge(any(), any())).thenReturn("badges/badge_1.png");
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);

        InscriptionResponseDTO result = inscriptionService.acceptInscription(1L);

        assertThat(result).isNotNull();
        verify(emailService, never()).sendAcceptanceEmail(any(), any(), any(), any());
    }

    // ==================== rejectInscription ====================

    @Test
    void rejectInscription_shouldRejectAndSendEmail() {
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);
        doNothing().when(emailService).sendRejectionEmail(anyString(), anyString(), anyString());

        InscriptionResponseDTO result = inscriptionService.rejectInscription(1L);

        assertThat(result.getStatus()).isEqualTo(InscriptionStatus.REJECTED);
        verify(emailService).sendRejectionEmail(anyString(), anyString(), anyString());
    }

    @Test
    void rejectInscription_shouldThrow_whenNotFound() {
        when(inscriptionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inscriptionService.rejectInscription(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Inscription introuvable");
    }

    @Test
    void rejectInscription_shouldThrow_whenAlreadyProcessed() {
        inscription.setStatus(InscriptionStatus.REJECTED);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));

        assertThatThrownBy(() -> inscriptionService.rejectInscription(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("déjà été traitée");
    }

    @Test
    void rejectInscription_shouldNotThrow_whenEmailFails() {

        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);
        doThrow(new MailSendException("SMTP error"))
                .when(emailService).sendRejectionEmail(anyString(), anyString(), anyString());

        InscriptionResponseDTO result = inscriptionService.rejectInscription(1L);

        assertThat(result).isNotNull();
    }

    @Test
    void rejectInscription_shouldSkipEmail_whenEmailIsNull() {

        inscription.setParticipantEmail(null);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(null);
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);

        InscriptionResponseDTO result = inscriptionService.rejectInscription(1L);

        assertThat(result).isNotNull();
        verify(emailService, never()).sendRejectionEmail(any(), any(), any());
    }

    // ==================== cancelInscription ====================

    @Test
    void cancelInscription_shouldCancel_whenAccepted() {
        inscription.setStatus(InscriptionStatus.ACCEPTED);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.findWaitlistByEventIdOrderedFIFO(1L)).thenReturn(Collections.emptyList());
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);

        InscriptionResponseDTO result = inscriptionService.cancelInscription(1L);

        assertThat(result.getStatus()).isEqualTo(InscriptionStatus.CANCELLED);
    }

    @Test
    void cancelInscription_shouldCancel_whenPending() {
        // wasConfirmed = false → ne déclenche pas promoteFromWaitlist
        inscription.setStatus(InscriptionStatus.PENDING);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.save(any(EventInscription.class))).thenReturn(inscription);

        InscriptionResponseDTO result = inscriptionService.cancelInscription(1L);

        assertThat(result.getStatus()).isEqualTo(InscriptionStatus.CANCELLED);
        verify(inscriptionRepository, never()).findWaitlistByEventIdOrderedFIFO(any());
    }

    @Test
    void cancelInscription_shouldThrow_whenAlreadyCancelled() {
        inscription.setStatus(InscriptionStatus.CANCELLED);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));

        assertThatThrownBy(() -> inscriptionService.cancelInscription(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("déjà annulée");
    }

    @Test
    void cancelInscription_shouldThrow_whenRejected() {
        inscription.setStatus(InscriptionStatus.REJECTED);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));

        assertThatThrownBy(() -> inscriptionService.cancelInscription(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("rejetée");
    }

    @Test
    void cancelInscription_shouldThrow_whenDeadlinePassed() {
        inscription.setStatus(InscriptionStatus.ACCEPTED);
        event.setStartDate(LocalDateTime.now().minusHours(1));
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);

        assertThatThrownBy(() -> inscriptionService.cancelInscription(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("24h");
    }

    @Test
    void cancelInscription_shouldPromoteFromWaitlist_whenConfirmedCancels() {
        inscription.setStatus(InscriptionStatus.ACCEPTED);

        EventInscription waitlistCandidate = new EventInscription();
        waitlistCandidate.setId(2L);
        waitlistCandidate.setUserId(2L);
        waitlistCandidate.setEventId(1L);
        waitlistCandidate.setStatus(InscriptionStatus.WAITLIST);
        waitlistCandidate.setParticipantNom("Ben Ali");
        waitlistCandidate.setParticipantPrenom("Sami");
        waitlistCandidate.setParticipantEmail("sami@email.com");

        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.findWaitlistByEventIdOrderedFIFO(1L)).thenReturn(List.of(waitlistCandidate));
        when(inscriptionRepository.save(any(EventInscription.class))).thenAnswer(inv -> inv.getArgument(0));
        when(badgeGeneratorService.generateBadge(any(), any())).thenReturn("badges/badge_2.png");

        inscriptionService.cancelInscription(1L);

        verify(badgeGeneratorService).generateBadge(eq(waitlistCandidate), any());
        assertThat(waitlistCandidate.getStatus()).isEqualTo(InscriptionStatus.PROMOTED);
    }

    @Test
    void cancelInscription_shouldContinue_whenBadgeGenerationFailsDuringPromotion() {

        inscription.setStatus(InscriptionStatus.ACCEPTED);

        EventInscription waitlistCandidate = new EventInscription();
        waitlistCandidate.setId(2L);
        waitlistCandidate.setUserId(2L);
        waitlistCandidate.setEventId(1L);
        waitlistCandidate.setStatus(InscriptionStatus.WAITLIST);
        waitlistCandidate.setParticipantNom("Ben Ali");
        waitlistCandidate.setParticipantPrenom("Sami");
        waitlistCandidate.setParticipantEmail("sami@email.com");

        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);
        when(inscriptionRepository.findWaitlistByEventIdOrderedFIFO(1L)).thenReturn(List.of(waitlistCandidate));
        when(inscriptionRepository.save(any(EventInscription.class))).thenAnswer(inv -> inv.getArgument(0));
        when(badgeGeneratorService.generateBadge(any(), any()))
                .thenThrow(new BadgeGenerationException("Erreur badge", new RuntimeException()));

        // ne doit pas propager l'exception
        InscriptionResponseDTO result = inscriptionService.cancelInscription(1L);

        assertThat(result).isNotNull();
    }

    // ==================== handleCapacityIncrease ====================

    @Test
    void handleCapacityIncrease_shouldPromote_whenSeatsAvailable() {
        EventInscription waitlisted = new EventInscription();
        waitlisted.setId(3L);
        waitlisted.setUserId(3L);
        waitlisted.setEventId(1L);
        waitlisted.setStatus(InscriptionStatus.WAITLIST);
        waitlisted.setParticipantNom("Trabelsi");
        waitlisted.setParticipantPrenom("Ines");
        waitlisted.setParticipantEmail("ines@email.com");

        when(eventClient.getEventById(1L)).thenReturn(event);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.ACCEPTED)).thenReturn(0L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.PROMOTED)).thenReturn(0L);
        when(inscriptionRepository.findWaitlistByEventIdOrderedFIFO(1L)).thenReturn(List.of(waitlisted));
        when(inscriptionRepository.save(any(EventInscription.class))).thenAnswer(inv -> inv.getArgument(0));
        when(badgeGeneratorService.generateBadge(any(), any())).thenReturn("badges/badge_3.png");

        inscriptionService.handleCapacityIncrease(1L, 10);

        assertThat(waitlisted.getStatus()).isEqualTo(InscriptionStatus.PROMOTED);
    }

    @Test
    void handleCapacityIncrease_shouldDoNothing_whenNoNewSeats() {
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.ACCEPTED)).thenReturn(100L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.PROMOTED)).thenReturn(0L);

        inscriptionService.handleCapacityIncrease(1L, 50);

        verify(inscriptionRepository, never()).findWaitlistByEventIdOrderedFIFO(any());
    }

    @Test
    void handleCapacityIncrease_shouldSkipPromotion_whenDeadlinePassed() {
        // couvre la branche "!isBeforeDeadline" dans handleCapacityIncrease
        event.setStartDate(LocalDateTime.now().minusHours(1));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.ACCEPTED)).thenReturn(0L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.PROMOTED)).thenReturn(0L);

        inscriptionService.handleCapacityIncrease(1L, 50);

        verify(inscriptionRepository, never()).findWaitlistByEventIdOrderedFIFO(any());
    }

    // ==================== getBadgeBytes ====================

    @Test
    void getBadgeBytes_shouldReturnBytes_whenAccepted() throws Exception {
        // crée un vrai fichier temporaire pour que Files.readAllBytes fonctionne
        Path tempFile = Files.createTempFile("badge_test", ".png");
        Files.write(tempFile, "fake-image-data".getBytes());

        inscription.setStatus(InscriptionStatus.ACCEPTED);
        inscription.setBadgeImagePath(tempFile.toString());
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));

        byte[] result = inscriptionService.getBadgeBytes(1L);

        assertThat(result).isNotEmpty();
        Files.deleteIfExists(tempFile); // nettoyage
    }

    @Test
    void getBadgeBytes_shouldReturnBytes_whenPromoted() throws Exception {
        Path tempFile = Files.createTempFile("badge_promoted", ".png");
        Files.write(tempFile, "fake-image-data".getBytes());

        inscription.setStatus(InscriptionStatus.PROMOTED);
        inscription.setBadgeImagePath(tempFile.toString());
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));

        byte[] result = inscriptionService.getBadgeBytes(1L);

        assertThat(result).isNotEmpty();
        Files.deleteIfExists(tempFile);
    }

    @Test
    void getBadgeBytes_shouldThrow_whenNotFound() {
        when(inscriptionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inscriptionService.getBadgeBytes(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Inscription introuvable");
    }

    @Test
    void getBadgeBytes_shouldThrow_whenStatusNotAccepted() {
        inscription.setStatus(InscriptionStatus.PENDING);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));

        assertThatThrownBy(() -> inscriptionService.getBadgeBytes(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Badge disponible uniquement");
    }

    @Test
    void getBadgeBytes_shouldThrow_whenBadgePathIsNull() {
        inscription.setStatus(InscriptionStatus.ACCEPTED);
        inscription.setBadgeImagePath(null);
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));

        assertThatThrownBy(() -> inscriptionService.getBadgeBytes(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Badge non généré");
    }

    // ==================== fetchEventSafely / fetchUserSafely ====================

    @Test
    void getAllInscriptionsByEvent_shouldHandleFeignException_forEvent() {

        when(eventClient.getEventById(1L)).thenThrow(mock(FeignException.class));

        List<InscriptionResponseDTO> result = inscriptionService.getAllInscriptionsByEvent(1L);

        // event null → retourne liste vide car findByEventId n'est pas appelé
        assertThat(result).isNotNull();
    }

    @Test
    void getInscriptionsByUser_shouldHandleFeignException_forUser() {

        inscription.setEventId(1L);
        when(inscriptionRepository.findByUserId(1L)).thenReturn(List.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenThrow(mock(FeignException.class));

        List<InscriptionResponseDTO> result = inscriptionService.getInscriptionsByUser(1L);

        assertThat(result).hasSize(1);
    }

    // ==================== getCapacityStatus ====================

    @Test
    void getCapacityStatus_shouldReturnCorrectValues() {
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.ACCEPTED)).thenReturn(30L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.PROMOTED)).thenReturn(5L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.WAITLIST)).thenReturn(10L);

        Map<String, Object> status = inscriptionService.getCapacityStatus(1L);

        assertThat(status)
                .containsEntry("eventId", 1L)
                .containsEntry("capacity", 100)
                .containsEntry("confirmedParticipants", 35L)
                .containsEntry("waitlistSize", 10L)
                .containsEntry("isFull", false)
                .containsEntry("isBeforeDeadline", true);
    }

    // ==================== deleteInscription ====================

    @Test
    void deleteInscription_shouldDelete() {
        when(inscriptionRepository.findById(1L)).thenReturn(Optional.of(inscription));
        doNothing().when(inscriptionRepository).delete(inscription);

        inscriptionService.deleteInscription(1L);

        verify(inscriptionRepository).delete(inscription);
    }

    @Test
    void deleteInscription_shouldThrow_whenNotFound() {
        when(inscriptionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inscriptionService.deleteInscription(99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Inscription introuvable");
    }

    // ==================== getPendingInscriptions ====================

    @Test
    void getPendingInscriptions_shouldReturnList() {
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(inscriptionRepository.findByEventIdAndStatus(1L, InscriptionStatus.PENDING))
                .thenReturn(List.of(inscription));
        when(userClient.getUserById(1)).thenReturn(user);

        List<InscriptionResponseDTO> result = inscriptionService.getPendingInscriptions(1L);

        assertThat(result)
                .hasSize(1)
                .first()
                .extracting(InscriptionResponseDTO::getStatus)
                .isEqualTo(InscriptionStatus.PENDING);
    }

    // ==================== getAllInscriptionsByEvent ====================

    @Test
    void getAllInscriptionsByEvent_shouldReturnList() {
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(inscriptionRepository.findByEventId(1L)).thenReturn(List.of(inscription));
        when(userClient.getUserById(1)).thenReturn(user);

        List<InscriptionResponseDTO> result = inscriptionService.getAllInscriptionsByEvent(1L);

        assertThat(result).hasSize(1);
    }

    // ==================== getInscriptionsByUser ====================

    @Test
    void getInscriptionsByUser_shouldReturnList() {
        when(inscriptionRepository.findByUserId(1L)).thenReturn(List.of(inscription));
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(userClient.getUserById(1)).thenReturn(user);

        List<InscriptionResponseDTO> result = inscriptionService.getInscriptionsByUser(1L);

        assertThat(result).hasSize(1);
    }

    // ==================== getWaitlistByEvent ====================

    @Test
    void getWaitlistByEvent_shouldReturnList() {
        inscription.setStatus(InscriptionStatus.WAITLIST);
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(inscriptionRepository.findWaitlistByEventIdOrderedFIFO(1L)).thenReturn(List.of(inscription));
        when(userClient.getUserById(1)).thenReturn(user);

        List<InscriptionResponseDTO> result = inscriptionService.getWaitlistByEvent(1L);

        assertThat(result).hasSize(1);
    }

    // ==================== isEventFull ====================

    @Test
    void isEventFull_shouldReturnTrue_whenFull() {
        event.setCapacity(1);
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.ACCEPTED)).thenReturn(1L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.PROMOTED)).thenReturn(0L);

        assertThat(inscriptionService.isEventFull(1L)).isTrue();
    }

    @Test
    void isEventFull_shouldReturnFalse_whenNotFull() {
        when(eventClient.getEventById(1L)).thenReturn(event);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.ACCEPTED)).thenReturn(30L);
        when(inscriptionRepository.countByEventIdAndStatus(1L, InscriptionStatus.PROMOTED)).thenReturn(5L);

        assertThat(inscriptionService.isEventFull(1L)).isFalse();
    }

    @Test
    void isEventFull_shouldReturnFalse_whenEventIsNull() {
        // couvre la branche "event == null" dans isFull
        when(eventClient.getEventById(1L)).thenReturn(null);

        assertThat(inscriptionService.isEventFull(1L)).isFalse();
    }
}