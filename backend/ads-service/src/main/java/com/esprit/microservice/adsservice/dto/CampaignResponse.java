package com.esprit.microservice.adsservice.dto;

import com.esprit.microservice.adsservice.entities.AdCampaign;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignResponse {

    private Long id;
    private Long userId;
    private Long planId;
    private String title;
    private String description;
    private String imageUrl;
    private String targetUrl;
    private String status;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private String roleType;
    private Long targetId;
    private String planName;
    private String planType;
    private String planLocation;
    private Long views;
    private Long clicks;
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    public static CampaignResponse fromEntity(AdCampaign campaign) {
        return CampaignResponse.builder()
                .id(campaign.getId())
                .userId(campaign.getUserId())
                .planId(campaign.getPlan().getId())
                .title(campaign.getTitle())
                .description(campaign.getDescription())
                .imageUrl(campaign.getImageUrl())
                .targetUrl(campaign.getTargetUrl())
                .status(campaign.getStatus().name())
                .rejectionReason(campaign.getRejectionReason())
                .createdAt(campaign.getCreatedAt())
                .roleType(campaign.getRoleType() != null ? campaign.getRoleType().name().toLowerCase() : null)
                .targetId(campaign.getTargetId())
                .planName(campaign.getPlan().getName())
                .planType(campaign.getPlan().getType().name())
                .planLocation(campaign.getPlan().getLocation().name())
                .views(campaign.getViews())
                .clicks(campaign.getClicks())
                .startDate(campaign.getStartDate())
                .endDate(campaign.getEndDate())
                .build();
    }
}
