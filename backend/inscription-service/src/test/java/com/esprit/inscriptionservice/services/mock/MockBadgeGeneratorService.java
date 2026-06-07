package com.esprit.inscriptionservice.services.mock;

import com.esprit.inscriptionservice.dto.EventDTO;
import com.esprit.inscriptionservice.entities.EventInscription;
import com.esprit.inscriptionservice.services.BadgeGeneratorService;

public class MockBadgeGeneratorService extends BadgeGeneratorService {

    @Override
    public String generateBadge(EventInscription inscription, EventDTO event) {
        // Retourne un faux chemin sans exécuter java.awt
        return "badges/badge_" + inscription.getId() + ".png";
    }
}
