package tn.esprit.microservice.subscriptionservice.subscription.service;

import tn.esprit.microservice.subscriptionservice.subscription.dto.request.SubscribeRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.UserSubscriptionResponse;

import java.util.List;

public interface UserSubscriptionService {
    UserSubscriptionResponse subscribe(SubscribeRequest request);
    UserSubscriptionResponse getActiveSubscription(Long userId);
    List<UserSubscriptionResponse> getUserSubscriptionHistory(Long userId);
    UserSubscriptionResponse getUserSubscriptionById(Long id);
    void cancelSubscription(Long userId);
    UserSubscriptionResponse renewSubscription(Long userId);
    void toggleAutoRenew(Long userId, Boolean autoRenew);
    void incrementProjectCount(Long userId);
    void incrementProposalCount(Long userId);
    void decrementProjectCount(Long userId);
    void decrementProposalCount(Long userId);
}