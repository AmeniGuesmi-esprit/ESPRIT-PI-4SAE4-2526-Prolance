package com.esprit.microservice.adsservice.controllers;

import com.esprit.microservice.adsservice.dto.AdminActionRequest;
import com.esprit.microservice.adsservice.dto.AiSuggestionResponse;
import com.esprit.microservice.adsservice.dto.CampaignResponse;
import com.esprit.microservice.adsservice.dto.CreateCampaignRequest;
import com.esprit.microservice.adsservice.dto.GenerateSuggestionRequest;
import com.esprit.microservice.adsservice.dto.ModerationResponse;
import com.esprit.microservice.adsservice.dto.ValidationRequest;
import com.esprit.microservice.adsservice.entities.AdCampaign;
import com.esprit.microservice.adsservice.entities.RoleType;
import com.esprit.microservice.adsservice.security.SecurityUtils;
import com.esprit.microservice.adsservice.services.AdCampaignService;
import com.esprit.microservice.adsservice.services.GroqAiService;
import com.esprit.microservice.adsservice.services.OllamaModerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@Slf4j
public class AdCampaignController {

    private final AdCampaignService campaignService;
    private final OllamaModerationService moderationService;
    private final GroqAiService groqAiService;

    // ── Public: view active campaigns ──
    @GetMapping("/active")
    public ResponseEntity<List<CampaignResponse>> getActiveCampaigns() {
        List<CampaignResponse> campaigns = campaignService.getActiveCampaigns()
                .stream().map(CampaignResponse::fromEntity).toList();
        return ResponseEntity.ok(campaigns);
    }

    // ── Public: view campaign details by ID ──
    @GetMapping("/{id}")
    public ResponseEntity<CampaignResponse> getCampaignById(@PathVariable Long id) {
        AdCampaign campaign = campaignService.findById(id);
        return ResponseEntity.ok(CampaignResponse.fromEntity(campaign));
    }

    // ── Public: AI content validation ──
    @PostMapping("/validate")
    public ResponseEntity<ModerationResponse> validateContent(
            @Valid @RequestBody ValidationRequest request) {
        log.info("[API] Validation request received for title: {}", request.getTitle());
        
        Long userId = SecurityUtils.getCurrentUserId();
        
        ModerationResponse response = moderationService.validateText(
                request.getTitle(), 
                request.getDescription(),
                userId
        );
        return ResponseEntity.ok(response);
    }

    // ── Public: AI ad suggestion generation ──
    @PostMapping("/generate-suggestion")
    public ResponseEntity<AiSuggestionResponse> generateSuggestion(
            @Valid @RequestBody GenerateSuggestionRequest request) {
        log.info("[API] AI suggestion request received for prompt: {}", request.getPrompt());
        AiSuggestionResponse response = groqAiService.generateAdSuggestion(request.getPrompt());
        return ResponseEntity.ok(response);
    }

    // ── Authenticated: create a campaign ──
    @PostMapping
    public ResponseEntity<CampaignResponse> createCampaign(
            @Valid @RequestBody CreateCampaignRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            log.error("User ID not found in JWT token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        AdCampaign campaign = campaignService.createCampaign(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(CampaignResponse.fromEntity(campaign));
    }

    // ── Authenticated: update own campaign ──
    @PutMapping("/{id}")
    public ResponseEntity<CampaignResponse> updateCampaign(
            @PathVariable Long id,
            @Valid @RequestBody CreateCampaignRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            log.error("User ID not found in JWT token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        AdCampaign campaign = campaignService.updateCampaign(id, request, userId);
        return ResponseEntity.ok(CampaignResponse.fromEntity(campaign));
    }

    // ── Authenticated: get my campaigns ──
    @GetMapping("/my")
    public ResponseEntity<List<CampaignResponse>> getMyCampaigns(
            @RequestParam(required = false) String role) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            log.error("User ID not found in JWT token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        List<AdCampaign> campaigns;
        if (role != null && !role.isBlank()) {
            RoleType roleType = RoleType.valueOf(role.toUpperCase());
            campaigns = campaignService.getMyCampaignsByRole(userId, roleType);
        } else {
            campaigns = campaignService.getMyCampaigns(userId);
        }
        return ResponseEntity.ok(campaigns.stream().map(CampaignResponse::fromEntity).toList());
    }

    // ── Authenticated: delete own campaign ──
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCampaign(@PathVariable Long id) {
        campaignService.deleteCampaign(id);
        return ResponseEntity.noContent().build();
    }

    // ══════════════════════════════════════════════
    // ADMIN ENDPOINTS
    // ══════════════════════════════════════════════

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CampaignResponse>> getAllCampaigns() {
        List<CampaignResponse> campaigns = campaignService.getAllCampaigns()
                .stream().map(CampaignResponse::fromEntity).toList();
        return ResponseEntity.ok(campaigns);
    }

    @PatchMapping("/admin/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampaignResponse> approveCampaign(@PathVariable Long id) {
        AdCampaign campaign = campaignService.approveCampaign(id);
        return ResponseEntity.ok(CampaignResponse.fromEntity(campaign));
    }

    @PatchMapping("/admin/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CampaignResponse> rejectCampaign(
            @PathVariable Long id,
            @RequestBody(required = false) AdminActionRequest request) {
        String reason = (request != null) ? request.getRejectionReason() : null;
        AdCampaign campaign = campaignService.rejectCampaign(id, reason);
        return ResponseEntity.ok(CampaignResponse.fromEntity(campaign));
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> adminDeleteCampaign(@PathVariable Long id) {
        campaignService.deleteCampaign(id);
        return ResponseEntity.noContent().build();
    }
}
