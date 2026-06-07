package com.esprit.microservice.adsservice.services;

import com.esprit.microservice.adsservice.dto.AdEvent;
import com.esprit.microservice.adsservice.dto.CreateCampaignRequest;
import com.esprit.microservice.adsservice.entities.AdCampaign;
import com.esprit.microservice.adsservice.entities.AdLocation;
import com.esprit.microservice.adsservice.entities.AdPlan;
import com.esprit.microservice.adsservice.entities.AdStatus;
import com.esprit.microservice.adsservice.entities.AdType;
import com.esprit.microservice.adsservice.entities.RoleType;
import com.esprit.microservice.adsservice.exception.BadRequestException;
import com.esprit.microservice.adsservice.exception.ResourceNotFoundException;
import com.esprit.microservice.adsservice.kafka.KafkaProducerService;
import com.esprit.microservice.adsservice.rag.AdVectorService;
import com.esprit.microservice.adsservice.repositories.AdCampaignRepository;
import com.esprit.microservice.adsservice.repositories.AdPlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdCampaignServiceTest {

    @Mock
    private AdCampaignRepository campaignRepository;

    @Mock
    private AdPlanRepository planRepository;

    @Mock
    private OllamaModerationService moderationService;

    @Mock
    private KafkaProducerService kafkaProducerService;

    @Mock
    private AdVectorService adVectorService;

    @InjectMocks
    private AdCampaignService adCampaignService;

    private AdPlan testPlan;
    private AdCampaign testCampaign;
    private CreateCampaignRequest testRequest;

    @BeforeEach
    void setUp() {
        testPlan = AdPlan.builder()
                .id(1L)
                .name("Test Plan")
                .type(AdType.BANNER)
                .price(29.99)
                .location(AdLocation.JOB_FEED)
                .roleType(RoleType.FREELANCER)
                .description("Test plan description")
                .durationDays(30)
                .build();

        testCampaign = AdCampaign.builder()
                .id(1L)
                .title("Test Campaign")
                .description("Test Description")
                .imageUrl("http://image.url")
                .targetUrl("http://target.url")
                .userId(100L)
                .plan(testPlan)
                .status(AdStatus.PENDING)
                .roleType(RoleType.FREELANCER)
                .views(0L)
                .clicks(0L)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusDays(30))
                .build();

        testRequest = CreateCampaignRequest.builder()
                .title("Test Campaign")
                .description("Test Description")
                .imageUrl("http://image.url")
                .targetUrl("http://target.url")
                .planId(1L)
                .roleType("FREELANCER")
                .build();

        lenient().doNothing().when(adVectorService).indexAd(any(AdCampaign.class));
        lenient().doNothing().when(adVectorService).removeAd(anyLong());
    }

    // ── createCampaign tests ──

    @Test
    void createCampaign_success() {
        when(planRepository.findById(1L)).thenReturn(Optional.of(testPlan));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);
        doNothing().when(kafkaProducerService).sendAdEvent(any(AdEvent.class));
        doNothing().when(moderationService).moderateCampaignText(anyLong(), anyString(), anyString(), anyLong());

        AdCampaign result = adCampaignService.createCampaign(testRequest, 100L);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Test Campaign");
        assertThat(result.getStatus()).isEqualTo(AdStatus.PENDING);
        verify(campaignRepository).save(any(AdCampaign.class));
        verify(kafkaProducerService).sendAdEvent(any(AdEvent.class));
        verify(moderationService).moderateCampaignText(eq(1L), eq("Test Campaign"), eq("Test Description"), eq(100L));
    }

    @Test
    void createCampaign_withAiSuggestion_setsCreatedByAI() {
        testRequest.setUsedAiSuggestion(true);
        when(planRepository.findById(1L)).thenReturn(Optional.of(testPlan));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        adCampaignService.createCampaign(testRequest, 100L);

        ArgumentCaptor<AdEvent> eventCaptor = ArgumentCaptor.forClass(AdEvent.class);
        verify(kafkaProducerService).sendAdEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getCreatedBy()).isEqualTo(AdEvent.CreatedBy.AI);
    }

    @Test
    void createCampaign_withoutAiSuggestion_setsCreatedByHuman() {
        testRequest.setUsedAiSuggestion(false);
        when(planRepository.findById(1L)).thenReturn(Optional.of(testPlan));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        adCampaignService.createCampaign(testRequest, 100L);

        ArgumentCaptor<AdEvent> eventCaptor = ArgumentCaptor.forClass(AdEvent.class);
        verify(kafkaProducerService).sendAdEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().getCreatedBy()).isEqualTo(AdEvent.CreatedBy.HUMAN);
    }

    @Test
    void createCampaign_planNotFound_throwsResourceNotFoundException() {
        when(planRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adCampaignService.createCampaign(testRequest, 100L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Ad plan not found");
    }

    @Test
    void createCampaign_invalidRoleType_fallsBackToPlanDefault() {
        testRequest.setRoleType("INVALID_ROLE");
        when(planRepository.findById(1L)).thenReturn(Optional.of(testPlan));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        AdCampaign result = adCampaignService.createCampaign(testRequest, 100L);

        assertThat(result).isNotNull();
        ArgumentCaptor<AdCampaign> captor = ArgumentCaptor.forClass(AdCampaign.class);
        verify(campaignRepository).save(captor.capture());
        assertThat(captor.getValue().getRoleType()).isEqualTo(RoleType.FREELANCER);
    }

    @Test
    void createCampaign_nullDurationDays_defaultsTo30() {
        testPlan.setDurationDays(null);
        when(planRepository.findById(1L)).thenReturn(Optional.of(testPlan));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        adCampaignService.createCampaign(testRequest, 100L);

        ArgumentCaptor<AdCampaign> captor = ArgumentCaptor.forClass(AdCampaign.class);
        verify(campaignRepository).save(captor.capture());
        AdCampaign saved = captor.getValue();
        assertThat(saved.getEndDate()).isAfter(saved.getStartDate());
    }

    // ── getMyCampaigns tests ──

    @Test
    void getMyCampaigns_returnsCampaignsForUser() {
        when(campaignRepository.findByUserIdOrderByCreatedAtDesc(100L)).thenReturn(List.of(testCampaign));

        List<AdCampaign> result = adCampaignService.getMyCampaigns(100L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getUserId()).isEqualTo(100L);
    }

    @Test
    void getMyCampaignsByRole_returnsCampaignsFilteredByRole() {
        when(campaignRepository.findByUserIdAndRoleTypeOrderByCreatedAtDesc(100L, RoleType.FREELANCER))
                .thenReturn(List.of(testCampaign));

        List<AdCampaign> result = adCampaignService.getMyCampaignsByRole(100L, RoleType.FREELANCER);

        assertThat(result).hasSize(1);
    }

    // ── getActiveCampaigns tests ──

    @Test
    void getActiveCampaigns_returnsActiveCampaigns() {
        testCampaign.setStatus(AdStatus.ACTIVE);
        when(campaignRepository.findByStatusOrderByCreatedAtDesc(AdStatus.ACTIVE)).thenReturn(List.of(testCampaign));

        List<AdCampaign> result = adCampaignService.getActiveCampaigns();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(AdStatus.ACTIVE);
    }

    // ── getAllCampaigns tests ──

    @Test
    void getAllCampaigns_returnsAllCampaigns() {
        when(campaignRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(testCampaign));

        List<AdCampaign> result = adCampaignService.getAllCampaigns();

        assertThat(result).hasSize(1);
    }

    // ── approveCampaign tests ──

    @Test
    void approveCampaign_pendingCampaign_setsActiveStatus() {
        testCampaign.setStatus(AdStatus.PENDING);
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        AdCampaign result = adCampaignService.approveCampaign(1L);

        assertThat(result.getStatus()).isEqualTo(AdStatus.ACTIVE);
        assertThat(result.getRejectionReason()).isNull();
    }

    @Test
    void approveCampaign_nonPendingCampaign_throwsBadRequestException() {
        testCampaign.setStatus(AdStatus.ACTIVE);
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));

        assertThatThrownBy(() -> adCampaignService.approveCampaign(1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Only PENDING campaigns can be approved");
    }

    @Test
    void approveCampaign_notFound_throwsResourceNotFoundException() {
        when(campaignRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adCampaignService.approveCampaign(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── rejectCampaign tests ──

    @Test
    void rejectCampaign_pendingCampaign_setsRejectedStatus() {
        testCampaign.setStatus(AdStatus.PENDING);
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        AdCampaign result = adCampaignService.rejectCampaign(1L, "Inappropriate content");

        assertThat(result.getStatus()).isEqualTo(AdStatus.REJECTED);
        assertThat(result.getRejectionReason()).isEqualTo("Inappropriate content");
    }

    @Test
    void rejectCampaign_blankReason_defaultsToAdminRejection() {
        testCampaign.setStatus(AdStatus.PENDING);
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        adCampaignService.rejectCampaign(1L, "   ");

        assertThat(testCampaign.getRejectionReason()).isEqualTo("Rejected by admin.");
    }

    @Test
    void rejectCampaign_nullReason_defaultsToAdminRejection() {
        testCampaign.setStatus(AdStatus.PENDING);
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        adCampaignService.rejectCampaign(1L, null);

        assertThat(testCampaign.getRejectionReason()).isEqualTo("Rejected by admin.");
    }

    @Test
    void rejectCampaign_nonPendingCampaign_throwsBadRequestException() {
        testCampaign.setStatus(AdStatus.ACTIVE);
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));

        assertThatThrownBy(() -> adCampaignService.rejectCampaign(1L, "reason"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Only PENDING campaigns can be rejected");
    }

    // ── deleteCampaign tests ──

    @Test
    void deleteCampaign_existingCampaign_deletesSuccessfully() {
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));

        adCampaignService.deleteCampaign(1L);

        verify(campaignRepository).delete(testCampaign);
    }

    @Test
    void deleteCampaign_notFound_throwsResourceNotFoundException() {
        when(campaignRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adCampaignService.deleteCampaign(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── updateCampaign tests ──

    @Test
    void updateCampaign_ownPendingCampaign_success() {
        testCampaign.setStatus(AdStatus.PENDING);
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));
        when(planRepository.findById(1L)).thenReturn(Optional.of(testPlan));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        AdCampaign result = adCampaignService.updateCampaign(1L, testRequest, 100L);

        assertThat(result).isNotNull();
        verify(moderationService).moderateCampaignText(anyLong(), anyString(), anyString(), eq(100L));
    }

    @Test
    void updateCampaign_rejectedCampaign_canBeEdited() {
        testCampaign.setStatus(AdStatus.REJECTED);
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));
        when(planRepository.findById(1L)).thenReturn(Optional.of(testPlan));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        AdCampaign result = adCampaignService.updateCampaign(1L, testRequest, 100L);

        assertThat(result).isNotNull();
        assertThat(testCampaign.getStatus()).isEqualTo(AdStatus.PENDING);
    }

    @Test
    void updateCampaign_differentUser_throwsBadRequestException() {
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));

        assertThatThrownBy(() -> adCampaignService.updateCampaign(1L, testRequest, 999L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("You can only update your own campaigns");
    }

    @Test
    void updateCampaign_activeCampaign_throwsBadRequestException() {
        testCampaign.setStatus(AdStatus.ACTIVE);
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));

        assertThatThrownBy(() -> adCampaignService.updateCampaign(1L, testRequest, 100L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Only PENDING or REJECTED campaigns can be edited");
    }

    @Test
    void updateCampaign_invalidRoleType_keepsExistingRole() {
        testCampaign.setStatus(AdStatus.PENDING);
        testRequest.setRoleType("INVALID");
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));
        when(planRepository.findById(1L)).thenReturn(Optional.of(testPlan));
        when(campaignRepository.save(any(AdCampaign.class))).thenReturn(testCampaign);

        adCampaignService.updateCampaign(1L, testRequest, 100L);

        assertThat(testCampaign.getRoleType()).isEqualTo(RoleType.FREELANCER);
    }

    // ── findById tests ──

    @Test
    void findById_existingId_returnsCampaign() {
        when(campaignRepository.findById(1L)).thenReturn(Optional.of(testCampaign));

        AdCampaign result = adCampaignService.findById(1L);

        assertThat(result).isEqualTo(testCampaign);
    }

    @Test
    void findById_nonExistingId_throwsResourceNotFoundException() {
        when(campaignRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adCampaignService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Campaign not found with id: 99");
    }
}
