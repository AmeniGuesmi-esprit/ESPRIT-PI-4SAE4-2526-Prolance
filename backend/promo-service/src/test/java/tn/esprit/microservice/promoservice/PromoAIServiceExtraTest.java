package tn.esprit.microservice.promoservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.microservice.promoservice.Entity.PromoCode;
import tn.esprit.microservice.promoservice.Repository.PromoCodeRepository;
import tn.esprit.microservice.promoservice.dto.PromoRecommendationDTO;
import tn.esprit.microservice.promoservice.service.PromoAIService;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PromoAIServiceExtraTest {

    @Mock
    private PromoCodeRepository promoCodeRepository;

    @InjectMocks
    private PromoAIService promoAIService;

    private PromoCode makePromo(String code, int discount, int maxUses, int currentUses,
                                 boolean active, LocalDateTime expiresAt, String description) {
        PromoCode p = new PromoCode();
        p.setId((long) code.hashCode());
        p.setCode(code);
        p.setDiscountPercent(discount);
        p.setMaxUses(maxUses);
        p.setCurrentUses(currentUses);
        p.setIsActive(active);
        p.setExpiresAt(expiresAt);
        p.setDescription(description);
        return p;
    }

    // ========== Score : audience CLIENT ==========

    @Test
    void getSmartRecommendations_forClient_returnsClientPromoFirst() {
        PromoCode clientPromo = makePromo("CLIENT20", 20, 50, 5, true,
                LocalDateTime.now().plusDays(30), "Offre client");
        PromoCode allPromo = makePromo("GENERAL10", 10, 100, 0, true,
                LocalDateTime.now().plusDays(30), "Pour tous");

        when(promoCodeRepository.findAll()).thenReturn(Arrays.asList(allPromo, clientPromo));

        List<PromoRecommendationDTO> recs =
                promoAIService.getSmartRecommendations("CLIENT", null, null);

        assertFalse(recs.isEmpty());
        assertEquals("CLIENT20", recs.get(0).getCode());
    }

    // ========== Score : urgence (expire dans <= 7 jours) ==========

    @Test
    void getSmartRecommendations_promoExpiringSoon_hasHigherScore() {
        PromoCode urgentPromo = makePromo("URGENT30", 30, 100, 0, true,
                LocalDateTime.now().plusDays(3), "Expire bientôt");
        PromoCode regularPromo = makePromo("REGULAR30", 30, 100, 0, true,
                LocalDateTime.now().plusDays(60), "Offre régulière");

        when(promoCodeRepository.findAll()).thenReturn(Arrays.asList(regularPromo, urgentPromo));

        List<PromoRecommendationDTO> recs =
                promoAIService.getSmartRecommendations("FREELANCER", null, null);

        // L'urgence boost le score, donc URGENT30 doit être devant
        assertFalse(recs.isEmpty());
        assertTrue(recs.get(0).getAiReason().contains("Expire dans") ||
                   recs.get(0).getCode().equals("URGENT30"));
    }

    // ========== Score : peu d'utilisations restantes ==========

    @Test
    void getSmartRecommendations_promoWithFewRemaining_boostsScore() {
        PromoCode scarcePomo = makePromo("SCARCE25", 25, 10, 8, true,
                LocalDateTime.now().plusDays(30), "Presque épuisé");
        // Only 2 remaining → score boost

        when(promoCodeRepository.findAll()).thenReturn(Collections.singletonList(scarcePomo));

        List<PromoRecommendationDTO> recs =
                promoAIService.getSmartRecommendations("FREELANCER", null, null);

        assertFalse(recs.isEmpty());
        assertEquals("SCARCE25", recs.get(0).getCode());
        assertEquals(2, recs.get(0).getRemainingUses());
        assertTrue(recs.get(0).getAiReason().contains("restants"));
    }

    // ========== Score : plan tier PRO + discount >= 20 ==========

    @Test
    void getSmartRecommendations_withProPlanAndHighDiscount_boostsScore() {
        PromoCode proPromo = makePromo("PRO25", 25, 100, 0, true,
                LocalDateTime.now().plusDays(30), "Super offre");

        when(promoCodeRepository.findAll()).thenReturn(Collections.singletonList(proPromo));

        List<PromoRecommendationDTO> recs =
                promoAIService.getSmartRecommendations("FREELANCER", "PRO", null);

        assertFalse(recs.isEmpty());
        assertTrue(recs.get(0).getAiReason().contains("Pro"));
    }

    // ========== Score : plan tier ELITE + discount >= 25 ==========

    @Test
    void getSmartRecommendations_withElitePlanAndHighDiscount_boostsScore() {
        PromoCode elitePromo = makePromo("ELITE30", 30, 100, 0, true,
                LocalDateTime.now().plusDays(30), "Elite deal");

        when(promoCodeRepository.findAll()).thenReturn(Collections.singletonList(elitePromo));

        List<PromoRecommendationDTO> recs =
                promoAIService.getSmartRecommendations("FREELANCER", "ELITE", null);

        assertFalse(recs.isEmpty());
        assertTrue(recs.get(0).getAiReason().contains("Elite"));
    }

    // ========== Score : nouveaux utilisateurs + code NEW ==========

    @Test
    void getSmartRecommendations_newUserWithNewCode_isPersonalizedAndBoosted() {
        PromoCode newCode = makePromo("NEWMEMBER20", 20, 100, 0, true,
                LocalDateTime.now().plusDays(30), "Bienvenue");

        when(promoCodeRepository.findAll()).thenReturn(Collections.singletonList(newCode));

        List<PromoRecommendationDTO> recs =
                promoAIService.getSmartRecommendations("FREELANCER", null, 50L);

        assertFalse(recs.isEmpty());
        assertTrue(recs.get(0).getIsPersonalized());
    }

    // ========== RelevanceScore : score <= 100 ==========

    @Test
    void getSmartRecommendations_scoreNeverExceeds100() {
        // Stack all bonuses
        PromoCode superPromo = makePromo("WELCOME_FREELANCER50", 50, 10, 8, true,
                LocalDateTime.now().plusDays(4), "Tout les bonus");

        when(promoCodeRepository.findAll()).thenReturn(Collections.singletonList(superPromo));

        List<PromoRecommendationDTO> recs =
                promoAIService.getSmartRecommendations("FREELANCER", "ELITE", 10L);

        assertFalse(recs.isEmpty());
        assertTrue(recs.get(0).getRelevanceScore() <= 100.0);
    }

    // ========== Code sans audience spécifique = "ALL" ==========

    @Test
    void getSmartRecommendations_generalPromo_isIncludedForAnyUserType() {
        PromoCode general = makePromo("SUMMER10", 10, 100, 0, true,
                LocalDateTime.now().plusDays(30), "Offre générale");

        when(promoCodeRepository.findAll()).thenReturn(Collections.singletonList(general));

        List<PromoRecommendationDTO> recsF =
                promoAIService.getSmartRecommendations("FREELANCER", null, null);
        List<PromoRecommendationDTO> recsC =
                promoAIService.getSmartRecommendations("CLIENT", null, null);

        assertFalse(recsF.isEmpty());
        assertFalse(recsC.isEmpty());
        assertEquals("ALL", recsF.get(0).getTargetAudience());
    }

    // ========== generateAIPromoCode: expiration correcte ==========

    @Test
    void generateAIPromoCode_expiresAtIsCorrectlySet() {
        when(promoCodeRepository.save(any(PromoCode.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        LocalDateTime before = LocalDateTime.now().plusDays(14);
        PromoCode result = promoAIService.generateAIPromoCode("FREELANCER", 20, 50, 15);
        LocalDateTime after = LocalDateTime.now().plusDays(16);

        assertTrue(result.getExpiresAt().isAfter(before));
        assertTrue(result.getExpiresAt().isBefore(after));
    }

    // ========== generateAIPromoCode : description non nulle ==========

    @Test
    void generateAIPromoCode_descriptionIsNeverNull() {
        when(promoCodeRepository.save(any(PromoCode.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PromoCode r1 = promoAIService.generateAIPromoCode("FREELANCER", 10, 20, 7);
        PromoCode r2 = promoAIService.generateAIPromoCode("CLIENT", 15, 30, 10);

        assertNotNull(r1.getDescription());
        assertNotNull(r2.getDescription());
        assertFalse(r1.getDescription().isEmpty());
        assertFalse(r2.getDescription().isEmpty());
    }

    // ========== Code avec expiresAt null (no expiry) ==========

    @Test
    void getSmartRecommendations_withNoExpiresAt_stillReturned() {
        PromoCode noExpiry = makePromo("FOREVER20", 20, 100, 0, true, null, "Sans expiration");

        when(promoCodeRepository.findAll()).thenReturn(Collections.singletonList(noExpiry));

        List<PromoRecommendationDTO> recs =
                promoAIService.getSmartRecommendations("FREELANCER", null, null);

        assertFalse(recs.isEmpty());
        assertEquals("FOREVER20", recs.get(0).getCode());
    }

    // ========== PromoRecommendationDTO : constructeur complet ==========

    @Test
    void promoRecommendationDTO_fullConstructor_setsAllFields() {
        LocalDateTime expiry = LocalDateTime.now().plusDays(10);

        PromoRecommendationDTO dto = new PromoRecommendationDTO(
                1L, "CODE", 30, "Desc", expiry,
                50, "Raison IA", 85.0, "FREELANCER", true
        );

        assertEquals(1L, dto.getId());
        assertEquals("CODE", dto.getCode());
        assertEquals(30, dto.getDiscountPercent());
        assertEquals("Desc", dto.getDescription());
        assertEquals(expiry, dto.getExpiresAt());
        assertEquals(50, dto.getRemainingUses());
        assertEquals("Raison IA", dto.getAiReason());
        assertEquals(85.0, dto.getRelevanceScore());
        assertEquals("FREELANCER", dto.getTargetAudience());
        assertTrue(dto.getIsPersonalized());
    }
}