package com.esprit.microservice.adsservice.controllers;

import com.esprit.microservice.adsservice.dto.AiSuggestionResponse;
import com.esprit.microservice.adsservice.dto.CampaignResponse;
import com.esprit.microservice.adsservice.dto.ModerationResponse;
import com.esprit.microservice.adsservice.entities.AdCampaign;
import com.esprit.microservice.adsservice.entities.AdLocation;
import com.esprit.microservice.adsservice.entities.AdPlan;
import com.esprit.microservice.adsservice.entities.AdStatus;
import com.esprit.microservice.adsservice.entities.AdType;
import com.esprit.microservice.adsservice.entities.RoleType;
import com.esprit.microservice.adsservice.services.AdCampaignService;
import com.esprit.microservice.adsservice.services.GroqAiService;
import com.esprit.microservice.adsservice.services.OllamaModerationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdCampaignControllerTest {

    @Mock
    private AdCampaignService campaignService;

    @Mock
    private OllamaModerationService moderationService;

    @Mock
    private GroqAiService groqAiService;

    @InjectMocks
    private AdCampaignController controller;

    private AdPlan testPlan;
    private AdCampaign testCampaign;

    @BeforeEach
    void setUp() {
        testPlan = AdPlan.builder()
                .id(1L)
                .name("Test Plan")
                .type(AdType.BANNER)
                .price(29.99)
                .location(AdLocation.JOB_FEED)
                .roleType(RoleType.FREELANCER)
                .durationDays(30)
                .build();

        testCampaign = AdCampaign.builder()
                .id(1L)
                .title("Test Campaign")
                .description("Test Description")
                .userId(100L)
                .plan(testPlan)
                .status(AdStatus.ACTIVE)
                .roleType(RoleType.FREELANCER)
                .views(10L)
                .clicks(2L)
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusDays(30))
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getActiveCampaigns_returnsOkWithCampaigns() {
        when(campaignService.getActiveCampaigns()).thenReturn(List.of(testCampaign));

        ResponseEntity<List<CampaignResponse>> response = controller.getActiveCampaigns();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getTitle()).isEqualTo("Test Campaign");
    }

    @Test
    void getActiveCampaigns_empty_returnsOkWithEmptyList() {
        when(campaignService.getActiveCampaigns()).thenReturn(List.of());

        ResponseEntity<List<CampaignResponse>> response = controller.getActiveCampaigns();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void getCampaignById_returnsOkWithCampaign() {
        when(campaignService.findById(1L)).thenReturn(testCampaign);

        ResponseEntity<CampaignResponse> response = controller.getCampaignById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(1L);
    }

    @Test
    void generateSuggestion_returnsOkWithSuggestion() {
        AiSuggestionResponse suggestion = new AiSuggestionResponse("AI Title", "AI Description");
        when(groqAiService.generateAdSuggestion(anyString())).thenReturn(suggestion);

        com.esprit.microservice.adsservice.dto.GenerateSuggestionRequest request =
                new com.esprit.microservice.adsservice.dto.GenerateSuggestionRequest();
        org.springframework.test.util.ReflectionTestUtils.setField(request, "prompt", "Create an ad for shoes");

        ResponseEntity<AiSuggestionResponse> response = controller.generateSuggestion(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getTitle()).isEqualTo("AI Title");
    }

    @Test
    void getAllCampaigns_admin_returnsOkWithAll() {
        when(campaignService.getAllCampaigns()).thenReturn(List.of(testCampaign));

        ResponseEntity<List<CampaignResponse>> response = controller.getAllCampaigns();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void approveCampaign_returnsOkWithApproved() {
        testCampaign.setStatus(AdStatus.ACTIVE);
        when(campaignService.approveCampaign(1L)).thenReturn(testCampaign);

        ResponseEntity<CampaignResponse> response = controller.approveCampaign(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    void rejectCampaign_withReason_returnsOkWithRejected() {
        testCampaign.setStatus(AdStatus.REJECTED);
        testCampaign.setRejectionReason("Spam");
        when(campaignService.rejectCampaign(eq(1L), eq("Spam"))).thenReturn(testCampaign);

        com.esprit.microservice.adsservice.dto.AdminActionRequest request =
                new com.esprit.microservice.adsservice.dto.AdminActionRequest("Spam");

        ResponseEntity<CampaignResponse> response = controller.rejectCampaign(1L, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getStatus()).isEqualTo("REJECTED");
    }

    @Test
    void rejectCampaign_nullRequest_passesNullReason() {
        testCampaign.setStatus(AdStatus.REJECTED);
        when(campaignService.rejectCampaign(eq(1L), eq(null))).thenReturn(testCampaign);

        ResponseEntity<CampaignResponse> response = controller.rejectCampaign(1L, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(campaignService).rejectCampaign(1L, null);
    }

    @Test
    void deleteCampaign_returnsNoContent() {
        ResponseEntity<Void> response = controller.deleteCampaign(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(campaignService).deleteCampaign(1L);
    }

    @Test
    void adminDeleteCampaign_returnsNoContent() {
        ResponseEntity<Void> response = controller.adminDeleteCampaign(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(campaignService).deleteCampaign(1L);
    }
}
