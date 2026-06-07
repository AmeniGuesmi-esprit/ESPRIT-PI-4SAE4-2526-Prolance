package com.esprit.inscriptionservice.services;

import com.esprit.inscriptionservice.dto.EventDTO;
import com.esprit.inscriptionservice.entities.EventInscription;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;


class BadgeGeneratorServiceTest {

    private BadgeGeneratorService badgeGeneratorService;

    @BeforeEach
    void setUp() {
        badgeGeneratorService = new BadgeGeneratorService();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private EventInscription buildInscription() {
        EventInscription inscription = new EventInscription();
        inscription.setId(1L);
        inscription.setParticipantNom("Marah");
        inscription.setParticipantPrenom("Yesmine");
        inscription.setParticipantEmail("yesmine@email.com");
        inscription.setUserId(1L);
        inscription.setEventId(1L);
        return inscription;
    }

    private EventDTO buildEvent() {
        EventDTO event = new EventDTO();
        event.setIdEvent(1L);
        event.setTitle("Conférence DevOps");
        event.setLocation("Salle A");
        event.setStartDate(LocalDateTime.now().plusDays(5));
        return event;
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    @Test
    void generateBadge_shouldCreateFile_withFullData() {
        EventInscription inscription = buildInscription();
        EventDTO event = buildEvent();

        String path = badgeGeneratorService.generateBadge(inscription, event);

        assertThat(path).isNotNull().endsWith(".png");
        assertThat(new File(path)).exists();
    }

    @Test
    void generateBadge_shouldSucceed_withNullEvent() {
        EventInscription inscription = buildInscription();

        String path = badgeGeneratorService.generateBadge(inscription, null);

        assertThat(path).isNotNull().endsWith(".png");
        assertThat(new File(path)).exists();
    }

    @Test
    void generateBadge_shouldSucceed_withNullEventDates() {
        EventInscription inscription = buildInscription();

        EventDTO event = new EventDTO();
        event.setTitle("Événement sans date");
        // startDate = null, location = null → couvre les branches null des conditions

        String path = badgeGeneratorService.generateBadge(inscription, event);

        assertThat(new File(path)).exists();
    }

    @Test
    void generateBadge_shouldSucceed_withNullImageUrl() {
        EventInscription inscription = buildInscription();
        inscription.setImageUrl(null); // couvre la branche "imageUrl == null" dans drawUserPhoto

        String path = badgeGeneratorService.generateBadge(inscription, buildEvent());

        assertThat(path).isNotNull();
        assertThat(new File(path)).exists();
    }

    @Test
    void generateBadge_shouldSucceed_withEmptyImageUrl() {
        EventInscription inscription = buildInscription();
        inscription.setImageUrl(""); // couvre la branche "imageUrl.isEmpty()"

        String path = badgeGeneratorService.generateBadge(inscription, buildEvent());

        assertThat(path).isNotNull();
        assertThat(new File(path)).exists();
    }

    @Test
    void generateBadge_shouldSucceed_withInvalidHttpImageUrl() {
        EventInscription inscription = buildInscription();
        // URL http invalide → IOException attrapée silencieusement dans drawUserPhoto
        inscription.setImageUrl("http://invalid-host-that-does-not-exist.xyz/photo.png");

        String path = badgeGeneratorService.generateBadge(inscription, buildEvent());

        assertThat(path).isNotNull();
        assertThat(new File(path)).exists();
    }

    @Test
    void generateBadge_shouldSucceed_withInvalidLocalImageUrl() {
        EventInscription inscription = buildInscription();
        // Fichier local inexistant → IOException attrapée silencieusement
        inscription.setImageUrl("/non/existent/path/photo.png");

        String path = badgeGeneratorService.generateBadge(inscription, buildEvent());

        assertThat(path).isNotNull();
        assertThat(new File(path)).exists();
    }

    @Test
    void generateBadge_shouldSucceed_withEventLocationNull() {
        EventInscription inscription = buildInscription();

        EventDTO event = buildEvent();
        event.setLocation(null); // couvre la branche "location != null"

        String path = badgeGeneratorService.generateBadge(inscription, event);

        assertThat(new File(path)).exists();
    }
}