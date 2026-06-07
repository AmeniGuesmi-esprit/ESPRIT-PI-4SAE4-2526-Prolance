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
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PromoAIServiceTest {

    @Mock
    private PromoCodeRepository promoCodeRepository;

    @InjectMocks
    private PromoAIService promoAIService;

    private PromoCode freelancerPromo;
    private PromoCode clientPromo;
    private PromoCode expiredPromo;

    @BeforeEach
    void setUp() {
        freelancerPromo = new PromoCode();
        freelancerPromo.setId(1L);
        freelancerPromo.setCode("FREELANCER25");
        freelancerPromo.setDiscountPercent(25);
        freelancerPromo.setMaxUses(100);
        freelancerPromo.setCurrentUses(10);
        freelancerPromo.setIsActive(true);
        freelancerPromo.setExpiresAt(LocalDateTime.now().plusDays(20));
        freelancerPromo.setDescription("Pour les freelancers");

        clientPromo = new PromoCode();
        clientPromo.setId(2L);
        clientPromo.setCode("CLIENT15");
        clientPromo.setDiscountPercent(15);
        clientPromo.setMaxUses(50);
        clientPromo.setCurrentUses(5);
        clientPromo.setIsActive(true);
        clientPromo.setExpiresAt(LocalDateTime.now().plusDays(60));
        clientPromo.setDescription("Offre client");

        expiredPromo = new PromoCode();
        expiredPromo.setId(3L);
        expiredPromo.setCode("OLD10");
        expiredPromo.setDiscountPercent(10);
        expiredPromo.setMaxUses(100);
        expiredPromo.setCurrentUses(10);
        expiredPromo.setIsActive(true);
        expiredPromo.setExpiresAt(LocalDateTime.now().minusDays(1));
    }

    @Test
    void getSmartRecommendations_forFreelancer_returnsFreelancerPromoFirst() {
        when(promoCodeRepository.findAll())
            .thenReturn(Arrays.asList(freelancerPromo, clientPromo, expiredPromo));

        List<PromoRecommendationDTO> recs =
            promoAIService.getSmartRecommendations("FREELANCER", "PRO", 1L);

        assertNotNull(recs);
        assertFalse(recs.isEmpty());
        assertEquals("FREELANCER25", recs.get(0).getCode());
        assertTrue(recs.stream().noneMatch(r -> r.getCode().equals("OLD10")));
    }

    @Test
    void getSmartRecommendations_returnsAtMost3Recommendations() {
        List<PromoCode> manyPromos = Arrays.asList(
            freelancerPromo, clientPromo,
            makePromo("FREELANCER20", "FREELANCER", 20),
            makePromo("FREELANCE30", "FREELANCER", 30),
            makePromo("ALL10", "ALL", 10)
        );
        when(promoCodeRepository.findAll()).thenReturn(manyPromos);

        List<PromoRecommendationDTO> recs =
            promoAIService.getSmartRecommendations("FREELANCER", null, null);

        assertTrue(recs.size() <= 3);
    }

    @Test
    void getSmartRecommendations_whenNoValidPromo_returnsEmptyList() {
        when(promoCodeRepository.findAll()).thenReturn(Arrays.asList(expiredPromo));

        List<PromoRecommendationDTO> recs =
            promoAIService.getSmartRecommendations("FREELANCER", null, null);

        assertTrue(recs.isEmpty());
    }

    @Test
    void getSmartRecommendations_forNewUser_boostsWelcomeCode() {
        PromoCode welcomePromo = new PromoCode();
        welcomePromo.setId(10L);
        welcomePromo.setCode("WELCOME20");
        welcomePromo.setDiscountPercent(20);
        welcomePromo.setMaxUses(100);
        welcomePromo.setCurrentUses(0);
        welcomePromo.setIsActive(true);
        welcomePromo.setExpiresAt(LocalDateTime.now().plusDays(10));
        welcomePromo.setDescription("Bienvenue");

        when(promoCodeRepository.findAll()).thenReturn(Arrays.asList(welcomePromo));

        List<PromoRecommendationDTO> recs =
            promoAIService.getSmartRecommendations("FREELANCER", null, 5L);

        assertFalse(recs.isEmpty());
        assertTrue(recs.get(0).getIsPersonalized());
        assertTrue(recs.get(0).getAiReason().contains("nouveaux membres"));
    }

    @Test
    void generateAIPromoCode_createsValidFreelancerPromo() {
        when(promoCodeRepository.save(any(PromoCode.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        PromoCode result = promoAIService.generateAIPromoCode("FREELANCER", 30, 50, 15);

        assertNotNull(result);
        assertTrue(result.getCode().startsWith("FL30"));
        assertEquals(30, result.getDiscountPercent());
        assertEquals(50, result.getMaxUses());
        assertEquals(0, result.getCurrentUses());
        assertTrue(result.getIsActive());
        assertNotNull(result.getExpiresAt());
        assertTrue(result.getDescription().contains("Freelancers"));
        verify(promoCodeRepository).save(any(PromoCode.class));
    }

    @Test
    void generateAIPromoCode_createsValidClientPromo() {
        when(promoCodeRepository.save(any(PromoCode.class)))
            .thenAnswer(inv -> inv.getArgument(0));

        PromoCode result = promoAIService.generateAIPromoCode("CLIENT", 20, 100, 30);

        assertNotNull(result);
        assertTrue(result.getCode().startsWith("CL20"));
        assertEquals(20, result.getDiscountPercent());
        assertTrue(result.getDescription().contains("Clients"));
    }

    private PromoCode makePromo(String code, String audience, int discount) {
        PromoCode p = new PromoCode();
        p.setCode(code);
        p.setDiscountPercent(discount);
        p.setMaxUses(100);
        p.setCurrentUses(0);
        p.setIsActive(true);
        p.setExpiresAt(LocalDateTime.now().plusDays(30));
        p.setDescription("Pour " + audience);
        return p;
    }
}