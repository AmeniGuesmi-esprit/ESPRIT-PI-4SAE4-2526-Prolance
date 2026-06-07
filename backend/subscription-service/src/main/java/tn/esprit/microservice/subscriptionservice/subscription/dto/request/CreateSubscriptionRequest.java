package tn.esprit.microservice.subscriptionservice.subscription.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.BillingCycle;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;

import java.math.BigDecimal;

@Data
public class CreateSubscriptionRequest {
    @NotBlank
    private String name;

    @NotNull
    private SubscriptionType type;

    @NotNull
    @DecimalMin("0.0")
    private BigDecimal price;

    @NotNull
    private BillingCycle billingCycle;

    private String description;
    private Integer maxProjects;
    private Integer maxProposals;
    private Integer maxActiveJobs;
    private Boolean featuredListing = false;
    private Boolean prioritySupport = false;
    private Boolean analyticsAccess = false;
}