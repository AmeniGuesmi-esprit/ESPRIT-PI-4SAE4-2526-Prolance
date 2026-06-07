package tn.esprit.microservice.subscriptionservice.subscription.dto.response;

import lombok.Data;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class UserSubscriptionResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private SubscriptionResponse subscription;
    private SubscriptionStatus status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private LocalDateTime cancelledAt;
    private Boolean autoRenew;
    private Integer currentProjects;
    private Integer currentProposals;
    private BigDecimal amountPaid;
    private String paymentMethod;
    private String transactionId;
    private LocalDateTime createdAt;
}