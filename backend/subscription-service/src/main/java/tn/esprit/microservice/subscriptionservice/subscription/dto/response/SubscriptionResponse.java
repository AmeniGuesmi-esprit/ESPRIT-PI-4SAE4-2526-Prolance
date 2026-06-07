package tn.esprit.microservice.subscriptionservice.subscription.dto.response;


import lombok.Data;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.BillingCycle;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class SubscriptionResponse {
    private Long id;
    private String name;
    private SubscriptionType type;
    private BigDecimal price;
    private BillingCycle billingCycle;
    private String description;
    private Integer maxProjects;
    private Integer maxProposals;
    private Integer maxActiveJobs;
    private Boolean featuredListing;
    private Boolean prioritySupport;
    private Boolean analyticsAccess;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long activeSubscribersCount;
}