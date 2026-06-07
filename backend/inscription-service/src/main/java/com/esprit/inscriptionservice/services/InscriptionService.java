package com.esprit.inscriptionservice.services;

import com.esprit.inscriptionservice.clients.EventClient;
import com.esprit.inscriptionservice.clients.UserClient;
import com.esprit.inscriptionservice.dto.*;
import com.esprit.inscriptionservice.entities.EventInscription;
import com.esprit.inscriptionservice.entities.InscriptionStatus;
import com.esprit.inscriptionservice.repositories.InscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class InscriptionService {

    private static final Logger log = LoggerFactory.getLogger(InscriptionService.class);
    private static final String INSCRIPTION_NOT_FOUND = "Inscription introuvable";

    private final InscriptionRepository inscriptionRepository;
    private final EventClient eventClient;
    private final UserClient userClient;
    private final BadgeGeneratorService badgeGeneratorService;
    private final EmailService emailService;

    public InscriptionService(InscriptionRepository inscriptionRepository,
                              EventClient eventClient,
                              UserClient userClient,
                              BadgeGeneratorService badgeGeneratorService,
                              EmailService emailService) {
        this.inscriptionRepository = inscriptionRepository;
        this.eventClient = eventClient;
        this.userClient = userClient;
        this.badgeGeneratorService = badgeGeneratorService;
        this.emailService = emailService;
    }

    private boolean isBeforeDeadline(EventDTO event) {
        if (event == null || event.getStartDate() == null) return true;
        return LocalDateTime.now().isBefore(event.getStartDate().minusDays(1));
    }

    private long confirmedCount(Long eventId) {
        return inscriptionRepository.countByEventIdAndStatus(eventId, InscriptionStatus.ACCEPTED)
                + inscriptionRepository.countByEventIdAndStatus(eventId, InscriptionStatus.PROMOTED);
    }

    private boolean isFull(EventDTO event, Long eventId) {
        if (event == null || event.getCapacity() == null || event.getCapacity() <= 0) return false;
        return confirmedCount(eventId) >= event.getCapacity();
    }

    @Transactional
    public InscriptionResponseDTO submitInscription(InscriptionRequestDTO request) {
        EventDTO event = eventClient.getEventById(request.getEventId());
        if (event == null) throw new IllegalArgumentException("Événement introuvable: " + request.getEventId());

        UserDTO user = userClient.getUserById(Math.toIntExact(request.getUserId()));
        if (user == null) throw new IllegalArgumentException("Utilisateur introuvable: " + request.getUserId());

        if (!isBeforeDeadline(event)) {
            throw new IllegalStateException("Les inscriptions sont fermées pour cet événement");
        }

        if (inscriptionRepository.existsByUserIdAndEventId(request.getUserId(), request.getEventId())) {
            throw new IllegalStateException("Vous avez déjà soumis une demande pour cet événement");
        }

        EventInscription inscription = buildInscription(request, user);

        if (isFull(event, request.getEventId())) {
            inscription.setStatus(InscriptionStatus.WAITLIST);
            inscription.setWaitlistDate(LocalDateTime.now());
            EventInscription saved = inscriptionRepository.save(inscription);
            return mapToResponse(saved, event, user);
        }

        inscription.setStatus(InscriptionStatus.PENDING);
        EventInscription saved = inscriptionRepository.save(inscription);
        return mapToResponse(saved, event, user);
    }

    @Transactional
    public InscriptionResponseDTO acceptInscription(Long inscriptionId) {
        EventInscription inscription = inscriptionRepository.findById(inscriptionId)
                .orElseThrow(() -> new IllegalArgumentException(INSCRIPTION_NOT_FOUND));

        if (inscription.getStatus() != InscriptionStatus.PENDING)
            throw new IllegalStateException("Cette demande a déjà été traitée");

        inscription.setStatus(InscriptionStatus.ACCEPTED);
        inscriptionRepository.save(inscription);

        EventDTO event = fetchEventSafely(inscription.getEventId());
        String badgePath = badgeGeneratorService.generateBadge(inscription, event);
        inscription.setBadgeImagePath(badgePath);
        inscriptionRepository.save(inscription);

        try {
            UserDTO user = fetchUserSafely(inscription.getUserId());
            String email = resolveEmail(inscription, user);
            if (email != null) {
                emailService.sendAcceptanceEmail(email,
                        fullName(inscription),
                        eventTitle(event), badgePath);
            }
        } catch (MailException e) {
            log.warn("Email d'acceptation non envoyé pour inscription {}: {}", inscriptionId, e.getMessage());
        }

        return mapToResponse(inscription, event, fetchUserSafely(inscription.getUserId()));
    }

    @Transactional
    public InscriptionResponseDTO rejectInscription(Long inscriptionId) {
        EventInscription inscription = inscriptionRepository.findById(inscriptionId)
                .orElseThrow(() -> new IllegalArgumentException(INSCRIPTION_NOT_FOUND));

        if (inscription.getStatus() != InscriptionStatus.PENDING)
            throw new IllegalStateException("Cette demande a déjà été traitée");

        inscription.setStatus(InscriptionStatus.REJECTED);
        inscriptionRepository.save(inscription);

        EventDTO event = fetchEventSafely(inscription.getEventId());
        try {
            UserDTO user = fetchUserSafely(inscription.getUserId());
            String email = resolveEmail(inscription, user);
            if (email != null) {
                emailService.sendRejectionEmail(email, fullName(inscription), eventTitle(event));
            }
        } catch (MailException e) {
            log.warn("Email de refus non envoyé pour inscription {}: {}", inscriptionId, e.getMessage());
        }

        return mapToResponse(inscription, event, fetchUserSafely(inscription.getUserId()));
    }

    @Transactional
    public InscriptionResponseDTO cancelInscription(Long inscriptionId) {
        EventInscription inscription = inscriptionRepository.findById(inscriptionId)
                .orElseThrow(() -> new IllegalArgumentException(INSCRIPTION_NOT_FOUND));

        if (inscription.getStatus() == InscriptionStatus.CANCELLED)
            throw new IllegalStateException("Cette inscription est déjà annulée");
        if (inscription.getStatus() == InscriptionStatus.REJECTED)
            throw new IllegalStateException("Une inscription rejetée ne peut pas être annulée");

        EventDTO event = fetchEventSafely(inscription.getEventId());

        if (!isBeforeDeadline(event)) {
            throw new IllegalStateException("Les annulations ne sont plus possibles à moins de 24h de l'événement");
        }

        boolean wasConfirmed = inscription.getStatus() == InscriptionStatus.ACCEPTED
                || inscription.getStatus() == InscriptionStatus.PROMOTED;

        inscription.setStatus(InscriptionStatus.CANCELLED);
        inscriptionRepository.save(inscription);

        if (wasConfirmed) {
            promoteFromWaitlist(inscription.getEventId(), event, 1);
        }

        return mapToResponse(inscription, event, fetchUserSafely(inscription.getUserId()));
    }

    @Transactional
    public void handleCapacityIncrease(Long eventId, int newCapacity) {
        EventDTO event = fetchEventSafely(eventId);
        long currentConfirmed = confirmedCount(eventId);
        long availableSeats = newCapacity - currentConfirmed;

        if (availableSeats <= 0) return;

        if (!isBeforeDeadline(event)) {
            log.info("Capacity increased for event {} but J-1 passed — no promotions", eventId);
            return;
        }

        promoteFromWaitlist(eventId, event, (int) availableSeats);
    }

    private void promoteFromWaitlist(Long eventId, EventDTO event, int count) {
        List<EventInscription> waitlist =
                inscriptionRepository.findWaitlistByEventIdOrderedFIFO(eventId);

        int promoted = 0;
        for (EventInscription candidate : waitlist) {
            if (promoted >= count) break;

            candidate.setStatus(InscriptionStatus.PROMOTED);
            inscriptionRepository.save(candidate);

            try {
                String badgePath = badgeGeneratorService.generateBadge(candidate, event);
                candidate.setBadgeImagePath(badgePath);
                inscriptionRepository.save(candidate);
            } catch (com.esprit.inscriptionservice.exceptions.BadgeGenerationException e) {
                log.warn("Badge non généré pour promotion {}: {}", candidate.getId(), e.getMessage());
            }

            promoted++;
        }

        log.info("Promoted {} participant(s) from waitlist for event {}", promoted, eventId);
    }

    // ← FIXED: throws IOException instead of generic Exception
    public byte[] getBadgeBytes(Long inscriptionId) throws IOException {
        EventInscription inscription = inscriptionRepository.findById(inscriptionId)
                .orElseThrow(() -> new IllegalArgumentException(INSCRIPTION_NOT_FOUND));

        if (inscription.getStatus() != InscriptionStatus.ACCEPTED
                && inscription.getStatus() != InscriptionStatus.PROMOTED)
            throw new IllegalStateException("Badge disponible uniquement pour les inscriptions acceptées");

        if (inscription.getBadgeImagePath() == null)
            throw new IllegalStateException("Badge non généré");

        // ← also cleaned up inline java.io.* references, now using proper imports
        File file = new File(inscription.getBadgeImagePath());
        return Files.readAllBytes(file.toPath());
    }

    public List<InscriptionResponseDTO> getAllInscriptionsByEvent(Long eventId) {
        EventDTO event = fetchEventSafely(eventId);
        return inscriptionRepository.findByEventId(eventId).stream()
                .map(i -> mapToResponse(i, event, fetchUserSafely(i.getUserId())))
                .toList();
    }

    public List<InscriptionResponseDTO> getInscriptionsByUser(Long userId) {
        return inscriptionRepository.findByUserId(userId).stream()
                .map(i -> mapToResponse(i, fetchEventSafely(i.getEventId()), fetchUserSafely(i.getUserId())))
                .toList();
    }

    public List<InscriptionResponseDTO> getPendingInscriptions(Long eventId) {
        EventDTO event = fetchEventSafely(eventId);
        return inscriptionRepository.findByEventIdAndStatus(eventId, InscriptionStatus.PENDING).stream()
                .map(i -> mapToResponse(i, event, fetchUserSafely(i.getUserId())))
                .toList();
    }

    public List<InscriptionResponseDTO> getWaitlistByEvent(Long eventId) {
        EventDTO event = fetchEventSafely(eventId);
        return inscriptionRepository.findWaitlistByEventIdOrderedFIFO(eventId).stream()
                .map(i -> mapToResponse(i, event, fetchUserSafely(i.getUserId())))
                .toList();
    }

    public void deleteInscription(Long inscriptionId) {
        EventInscription inscription = inscriptionRepository.findById(inscriptionId)
                .orElseThrow(() -> new IllegalArgumentException(INSCRIPTION_NOT_FOUND));
        inscriptionRepository.delete(inscription);
    }

    public boolean isEventFull(Long eventId) {
        EventDTO event = fetchEventSafely(eventId);
        return isFull(event, eventId);
    }

    public Map<String, Object> getCapacityStatus(Long eventId) {
        EventDTO event = fetchEventSafely(eventId);
        long confirmed = confirmedCount(eventId);
        long waitlistSize = inscriptionRepository.countByEventIdAndStatus(eventId, InscriptionStatus.WAITLIST);

        Map<String, Object> status = new HashMap<>();
        status.put("eventId", eventId);
        status.put("capacity", event != null ? event.getCapacity() : 0);
        status.put("confirmedParticipants", confirmed);
        status.put("waitlistSize", waitlistSize);
        status.put("isFull", isFull(event, eventId));

        boolean beforeDeadline = isBeforeDeadline(event);
        status.put("isBeforeDeadline", beforeDeadline);

        return status;
    }

    private EventDTO fetchEventSafely(Long eventId) {
        if (eventId == null) return null;
        try {
            return eventClient.getEventById(eventId);
        } catch (feign.FeignException e) {
            log.warn("Événement non récupérable (id={}): {}", eventId, e.getMessage());
            return null;
        }
    }

    private UserDTO fetchUserSafely(Long userId) {
        if (userId == null) return null;
        try {
            return userClient.getUserById(Math.toIntExact(userId));
        } catch (feign.FeignException e) {
            log.warn("Utilisateur non récupérable (id={}): {}", userId, e.getMessage());
            return null;
        }
    }

    private EventInscription buildInscription(InscriptionRequestDTO request, UserDTO user) {
        EventInscription i = new EventInscription();
        i.setParticipantNom(request.getParticipantNom());
        i.setParticipantPrenom(request.getParticipantPrenom());
        i.setParticipantEmail(request.getParticipantEmail() != null
                ? request.getParticipantEmail() : user.getEmail());
        i.setDomaine(request.getDomaine());
        i.setParticipantRole(request.getParticipantRole());
        i.setImageUrl(request.getImageUrl());
        i.setMessage(request.getMessage());
        i.setRegistrationDate(LocalDateTime.now());
        i.setUserId(request.getUserId());
        i.setEventId(request.getEventId());
        return i;
    }

    private String resolveEmail(EventInscription i, UserDTO user) {
        if (i.getParticipantEmail() != null) {
            return i.getParticipantEmail();
        }
        if (user != null) {
            return user.getEmail();
        }
        return null;
    }

    private String fullName(EventInscription i) {
        return i.getParticipantPrenom() + " " + i.getParticipantNom();
    }

    private String eventTitle(EventDTO event) {
        return event != null ? event.getTitle() : "Événement";
    }

    private InscriptionResponseDTO mapToResponse(EventInscription i, EventDTO event, UserDTO user) {
        InscriptionResponseDTO dto = new InscriptionResponseDTO();
        dto.setId(i.getId());
        dto.setParticipantNom(i.getParticipantNom());
        dto.setParticipantPrenom(i.getParticipantPrenom());
        dto.setParticipantEmail(resolveEmail(i, user));
        dto.setRegistrationDate(i.getRegistrationDate());
        dto.setWaitlistDate(i.getWaitlistDate());
        dto.setDomaine(i.getDomaine());
        dto.setParticipantRole(i.getParticipantRole());
        dto.setImageUrl(i.getImageUrl());
        dto.setMessage(i.getMessage());
        dto.setStatus(i.getStatus());
        dto.setBadgeImagePath(i.getBadgeImagePath());
        dto.setUserId(i.getUserId());
        dto.setEventId(i.getEventId());
        dto.setEventTitle(event != null ? event.getTitle() : null);
        dto.setEventStartDate(event != null ? event.getStartDate() : null);
        dto.setEventLocation(event != null ? event.getLocation() : null);
        return dto;
    }
}