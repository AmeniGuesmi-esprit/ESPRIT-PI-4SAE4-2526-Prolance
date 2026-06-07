package tn.esprit.microservice.promoservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import tn.esprit.microservice.promoservice.Controller.PromoController;
import tn.esprit.microservice.promoservice.Entity.PromoCode;
import tn.esprit.microservice.promoservice.Repository.PromoCodeRepository;
import tn.esprit.microservice.promoservice.dto.PromoRecommendationDTO;
import tn.esprit.microservice.promoservice.service.PromoAIService;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PromoControllerTest {

    @Mock
    private PromoCodeRepository promoCodeRepository;

    @Mock
    private PromoAIService promoAIService;

    @InjectMocks
    private PromoController promoController;

    private PromoCode samplePromo;

    @BeforeEach
    void setUp() {
        samplePromo = new PromoCode();
        samplePromo.setId(1L);
        samplePromo.setCode("SUMMER2026");
        samplePromo.setDiscountPercent(25);
        samplePromo.setMaxUses(100);
        samplePromo.setCurrentUses(5);
        samplePromo.setIsActive(true);
        samplePromo.setExpiresAt(LocalDateTime.now().plusDays(30));
        samplePromo.setDescription("Offre d'été");
    }

    // ========= AI Recommendations =========
    @Test
    void getAIRecommendations_returnsRecommendationsMap() {
        PromoRecommendationDTO rec = new PromoRecommendationDTO();
        rec.setCode("FREELANCER25");
        rec.setDiscountPercent(25);

        when(promoAIService.getSmartRecommendations("FREELANCER", "PRO", 1L))
            .thenReturn(Arrays.asList(rec));

        ResponseEntity<Map<String, Object>> response =
            promoController.getAIRecommendations("FREELANCER", "PRO", 1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue((Boolean) response.getBody().get("success"));
        assertEquals(1, response.getBody().get("totalFound"));
        assertEquals("PromoRecommender-v1.0", response.getBody().get("aiModel"));
    }

    @Test
    void getAIRecommendations_whenNoRecommendations_returnsEmptyList() {
        when(promoAIService.getSmartRecommendations(anyString(), anyString(), anyLong()))
            .thenReturn(Arrays.asList());

        ResponseEntity<Map<String, Object>> response =
            promoController.getAIRecommendations("FREELANCER", "BASIC", 1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, response.getBody().get("totalFound"));
    }

    // ========= CRUD - getAllPromos =========
    @Test
    void getAllPromos_returnsListOfPromos() {
        when(promoCodeRepository.findAll())
            .thenReturn(Arrays.asList(samplePromo, new PromoCode()));

        ResponseEntity<List<PromoCode>> response = promoController.getAllPromos();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().size());
    }

    // ========= CRUD - getPromoById =========
    @Test
    void getPromoById_whenExists_returnsPromo() {
        when(promoCodeRepository.findById(1L)).thenReturn(Optional.of(samplePromo));

        ResponseEntity<PromoCode> response = promoController.getPromoById(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("SUMMER2026", response.getBody().getCode());
    }

    @Test
    void getPromoById_whenNotFound_returnsNotFound() {
        when(promoCodeRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseEntity<PromoCode> response = promoController.getPromoById(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // ========= CRUD - createPromo =========
    @Test
    void createPromo_setsDefaultValuesAndSaves() {
        PromoCode newPromo = new PromoCode();
        newPromo.setCode("NEW10");
        newPromo.setDiscountPercent(10);
        newPromo.setMaxUses(50);
        // isActive is null, should become true

        when(promoCodeRepository.save(any(PromoCode.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<PromoCode> response = promoController.createPromo(newPromo);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, response.getBody().getCurrentUses());
        assertTrue(response.getBody().getIsActive());
        verify(promoCodeRepository).save(any(PromoCode.class));
    }

    @Test
    void createPromo_whenIsActiveProvided_keepsIt() {
        PromoCode newPromo = new PromoCode();
        newPromo.setCode("INACTIVE");
        newPromo.setDiscountPercent(5);
        newPromo.setMaxUses(10);
        newPromo.setIsActive(false);

        when(promoCodeRepository.save(any(PromoCode.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<PromoCode> response = promoController.createPromo(newPromo);

        assertFalse(response.getBody().getIsActive());
    }

    // ========= AI Generate =========
    @Test
    void generateAIPromo_returnsGeneratedPromoResponse() {
        when(promoAIService.generateAIPromoCode("FREELANCER", 15, 100, 30))
            .thenReturn(samplePromo);

        ResponseEntity<Map<String, Object>> response =
            promoController.generateAIPromo("FREELANCER", 15, 100, 30);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue((Boolean) response.getBody().get("success"));
        assertNotNull(response.getBody().get("promo"));
        assertTrue(response.getBody().get("message").toString().contains("IA"));
    }

    // ========= CRUD - updatePromo =========
    @Test
    void updatePromo_whenExists_updatesFields() {
        PromoCode updated = new PromoCode();
        updated.setCode("UPDATED");
        updated.setDiscountPercent(30);
        updated.setDescription("Mise à jour");
        updated.setMaxUses(200);
        updated.setIsActive(true);

        when(promoCodeRepository.findById(1L)).thenReturn(Optional.of(samplePromo));
        when(promoCodeRepository.save(any(PromoCode.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<PromoCode> response = promoController.updatePromo(1L, updated);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("UPDATED", response.getBody().getCode());
        assertEquals(30, response.getBody().getDiscountPercent());
        assertEquals(200, response.getBody().getMaxUses());
    }

    @Test
    void updatePromo_whenNotFound_returnsNotFound() {
        when(promoCodeRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseEntity<PromoCode> response =
            promoController.updatePromo(999L, new PromoCode());

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(promoCodeRepository, never()).save(any());
    }

    // ========= CRUD - deletePromo =========
    @Test
    void deletePromo_whenExists_returnsNoContent() {
        when(promoCodeRepository.existsById(1L)).thenReturn(true);
        doNothing().when(promoCodeRepository).deleteById(1L);

        ResponseEntity<Void> response = promoController.deletePromo(1L);

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(promoCodeRepository).deleteById(1L);
    }

    @Test
    void deletePromo_whenNotExists_returnsNotFound() {
        when(promoCodeRepository.existsById(999L)).thenReturn(false);

        ResponseEntity<Void> response = promoController.deletePromo(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(promoCodeRepository, never()).deleteById(anyLong());
    }

    // ========= Toggle =========
    @Test
    void togglePromo_whenActive_deactivates() {
        samplePromo.setIsActive(true);
        when(promoCodeRepository.findById(1L)).thenReturn(Optional.of(samplePromo));
        when(promoCodeRepository.save(any(PromoCode.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<PromoCode> response = promoController.togglePromo(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertFalse(response.getBody().getIsActive());
    }

    @Test
    void togglePromo_whenInactive_activates() {
        samplePromo.setIsActive(false);
        when(promoCodeRepository.findById(1L)).thenReturn(Optional.of(samplePromo));
        when(promoCodeRepository.save(any(PromoCode.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<PromoCode> response = promoController.togglePromo(1L);

        assertTrue(response.getBody().getIsActive());
    }

    @Test
    void togglePromo_whenNotFound_returnsNotFound() {
        when(promoCodeRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseEntity<PromoCode> response = promoController.togglePromo(999L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    // ========= Stats =========
    @Test
    void getStats_returnsStatsMap() {
        PromoCode p1 = new PromoCode();
        p1.setDiscountPercent(20);
        p1.setMaxUses(100);
        p1.setCurrentUses(10);
        p1.setIsActive(true);
        p1.setExpiresAt(LocalDateTime.now().plusDays(5));

        PromoCode p2 = new PromoCode();
        p2.setDiscountPercent(30);
        p2.setMaxUses(50);
        p2.setCurrentUses(50); // pas valide : maxUses atteint
        p2.setIsActive(true);
        p2.setExpiresAt(LocalDateTime.now().plusDays(10));

        when(promoCodeRepository.findAll()).thenReturn(Arrays.asList(p1, p2));

        ResponseEntity<Map<String, Object>> response = promoController.getStats();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(2, response.getBody().get("totalPromos"));
        assertEquals(1L, response.getBody().get("activePromos"));
        assertEquals(60, response.getBody().get("totalUsages"));
        assertEquals(25.0, response.getBody().get("averageDiscount"));
    }

    @Test
    void getStats_whenNoPromos_returnsZeroes() {
        when(promoCodeRepository.findAll()).thenReturn(Arrays.asList());

        ResponseEntity<Map<String, Object>> response = promoController.getStats();

        assertEquals(0, response.getBody().get("totalPromos"));
        assertEquals(0L, response.getBody().get("activePromos"));
        assertEquals(0, response.getBody().get("totalUsages"));
        assertEquals(0.0, response.getBody().get("averageDiscount"));
    }
}