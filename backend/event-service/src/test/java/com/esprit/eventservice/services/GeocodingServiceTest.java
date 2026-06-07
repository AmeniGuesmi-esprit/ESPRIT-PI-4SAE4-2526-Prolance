package com.esprit.eventservice.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeocodingServiceTest {

    private RestTemplate restTemplate;
    private GeocodingService geocodingService;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);

        RestTemplateBuilder builder = mock(RestTemplateBuilder.class);
        when(builder.build()).thenReturn(restTemplate);

        geocodingService = new GeocodingService(builder);
    }

    // ════════════════════════════════════════════════════════════════════════
    // geocodeAddress() — chemin nominal (coordonnées trouvées)
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("geocodeAddress - succès : retourne [lat, lon] correctement parsés")
    void geocodeAddress_success_returnsCoordinates() {
        Map<String, Object> nominatimResult = Map.of(
                "lat", "36.8190",
                "lon", "10.1658"
        );

        ResponseEntity<List<Map<String, Object>>> responseEntity =
                new ResponseEntity<>(List.of(nominatimResult), HttpStatus.OK);

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(responseEntity);

        double[] coords = geocodingService.geocodeAddress("Tunis, Tunisie");

        assertThat(coords).hasSize(2);
        assertThat(coords[0]).isEqualTo(36.8190);
        assertThat(coords[1]).isEqualTo(10.1658);
    }

    // ════════════════════════════════════════════════════════════════════════
    // geocodeAddress() — résultats vides
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("geocodeAddress - résultats vides : retourne un tableau vide")
    void geocodeAddress_emptyResults_returnsEmptyArray() {
        ResponseEntity<List<Map<String, Object>>> responseEntity =
                new ResponseEntity<>(List.of(), HttpStatus.OK);

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(responseEntity);

        double[] coords = geocodingService.geocodeAddress("adresse inconnue xyz");

        assertThat(coords).isEmpty();
    }

    // ════════════════════════════════════════════════════════════════════════
    // geocodeAddress() — body null
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("geocodeAddress - body null : retourne un tableau vide")
    void geocodeAddress_nullBody_returnsEmptyArray() {
        ResponseEntity<List<Map<String, Object>>> responseEntity =
                new ResponseEntity<>(null, HttpStatus.OK);

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(responseEntity);

        double[] coords = geocodingService.geocodeAddress("Tunis");

        assertThat(coords).isEmpty();
    }

    // ════════════════════════════════════════════════════════════════════════
    // geocodeAddress() — exception réseau (catch bloc)
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("geocodeAddress - exception réseau : retourne un tableau vide sans lever d'exception")
    void geocodeAddress_networkException_returnsEmptyArray() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenThrow(new RuntimeException("Connection refused"));

        double[] coords = geocodingService.geocodeAddress("Tunis");

        // Must not throw — should return empty array (the catch branch)
        assertThat(coords).isEmpty();
    }

    // ════════════════════════════════════════════════════════════════════════
    // geocodeAddress() — plusieurs résultats : seul le premier est utilisé
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("geocodeAddress - plusieurs résultats : retourne les coordonnées du premier")
    void geocodeAddress_multipleResults_returnsFirst() {
        Map<String, Object> first  = Map.of("lat", "36.8190", "lon", "10.1658");
        Map<String, Object> second = Map.of("lat", "48.8566", "lon", "2.3522");

        ResponseEntity<List<Map<String, Object>>> responseEntity =
                new ResponseEntity<>(List.of(first, second), HttpStatus.OK);

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(responseEntity);

        double[] coords = geocodingService.geocodeAddress("Tunis");

        assertThat(coords[0]).isEqualTo(36.8190);
        assertThat(coords[1]).isEqualTo(10.1658);
    }

    // ════════════════════════════════════════════════════════════════════════
    // geocodeAddress() — encodage de l'adresse (caractères spéciaux)
    // ════════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("geocodeAddress - adresse avec espaces et accents : n'échoue pas à encoder")
    void geocodeAddress_specialCharsInAddress_encodedCorrectly() {
        ResponseEntity<List<Map<String, Object>>> responseEntity =
                new ResponseEntity<>(List.of(), HttpStatus.OK);

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class),
                any(ParameterizedTypeReference.class)))
                .thenReturn(responseEntity);

        // Should not throw even with spaces / accents
        assertThatCode(() -> geocodingService.geocodeAddress("Île-de-France, Île Ségou"))
                .doesNotThrowAnyException();
    }
}
