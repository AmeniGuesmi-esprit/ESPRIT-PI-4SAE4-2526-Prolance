package tn.esprit.microservice.subscriptionservice.subscription.domain.entities;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.BillingCycle;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionType type;

    @Column(nullable = false)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BillingCycle billingCycle;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer maxProjects;
    private Integer maxProposals;
    private Integer maxActiveJobs;

    @Column(nullable = false)
    private Boolean featuredListing = false;
    @Column(nullable = false)
    private Boolean prioritySupport = false;
    @Column(nullable = false)
    private Boolean analyticsAccess = false;
    @Column(nullable = false)
    private Boolean isActive = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}