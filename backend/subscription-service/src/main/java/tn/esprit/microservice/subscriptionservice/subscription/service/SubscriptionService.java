package tn.esprit.microservice.subscriptionservice.subscription.service;

import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.CreateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.UpdateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SubscriptionResponse;

import java.util.List;

public interface SubscriptionService {
    SubscriptionResponse createSubscription(CreateSubscriptionRequest request);
    List<SubscriptionResponse> getAllSubscriptions();
    List<SubscriptionResponse> getActiveSubscriptions();
    List<SubscriptionResponse> getSubscriptionsByType(SubscriptionType type);
    SubscriptionResponse getSubscriptionById(Long id);
    SubscriptionResponse updateSubscription(Long id, UpdateSubscriptionRequest request);
    void deactivateSubscription(Long id);
    void activateSubscription(Long id);
    void deleteSubscription(Long id);
}