package tn.esprit.microservice.subscriptionservice.subscription.mapper;

import org.springframework.stereotype.Component;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.Subscription;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.CreateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.UpdateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SubscriptionResponse;

@Component
public class SubscriptionMapper {

    public Subscription toEntity(CreateSubscriptionRequest request) {
        Subscription s = new Subscription();
        s.setName(request.getName());
        s.setType(request.getType());
        s.setPrice(request.getPrice());
        s.setBillingCycle(request.getBillingCycle());
        s.setDescription(request.getDescription());
        s.setMaxProjects(request.getMaxProjects());
        s.setMaxProposals(request.getMaxProposals());
        s.setMaxActiveJobs(request.getMaxActiveJobs());
        s.setFeaturedListing(request.getFeaturedListing() != null ? request.getFeaturedListing() : false);
        s.setPrioritySupport(request.getPrioritySupport() != null ? request.getPrioritySupport() : false);
        s.setAnalyticsAccess(request.getAnalyticsAccess() != null ? request.getAnalyticsAccess() : false);
        s.setIsActive(true);
        return s;
    }

    public SubscriptionResponse toResponse(Subscription s) {
        SubscriptionResponse r = new SubscriptionResponse();
        r.setId(s.getId());
        r.setName(s.getName());
        r.setType(s.getType());
        r.setPrice(s.getPrice());
        r.setBillingCycle(s.getBillingCycle());
        r.setDescription(s.getDescription());
        r.setMaxProjects(s.getMaxProjects());
        r.setMaxProposals(s.getMaxProposals());
        r.setMaxActiveJobs(s.getMaxActiveJobs());
        r.setFeaturedListing(s.getFeaturedListing());
        r.setPrioritySupport(s.getPrioritySupport());
        r.setAnalyticsAccess(s.getAnalyticsAccess());
        r.setIsActive(s.getIsActive());
        r.setCreatedAt(s.getCreatedAt());
        r.setUpdatedAt(s.getUpdatedAt());
        return r;
    }

    public void updateEntity(Subscription s, UpdateSubscriptionRequest request) {
        if (request.getName() != null) s.setName(request.getName());
        if (request.getType() != null) s.setType(request.getType());
        if (request.getPrice() != null) s.setPrice(request.getPrice());
        if (request.getBillingCycle() != null) s.setBillingCycle(request.getBillingCycle());
        if (request.getDescription() != null) s.setDescription(request.getDescription());
        if (request.getMaxProjects() != null) s.setMaxProjects(request.getMaxProjects());
        if (request.getMaxProposals() != null) s.setMaxProposals(request.getMaxProposals());
        if (request.getMaxActiveJobs() != null) s.setMaxActiveJobs(request.getMaxActiveJobs());
        if (request.getFeaturedListing() != null) s.setFeaturedListing(request.getFeaturedListing());
        if (request.getPrioritySupport() != null) s.setPrioritySupport(request.getPrioritySupport());
        if (request.getAnalyticsAccess() != null) s.setAnalyticsAccess(request.getAnalyticsAccess());
        if (request.getIsActive() != null) s.setIsActive(request.getIsActive());
    }
}