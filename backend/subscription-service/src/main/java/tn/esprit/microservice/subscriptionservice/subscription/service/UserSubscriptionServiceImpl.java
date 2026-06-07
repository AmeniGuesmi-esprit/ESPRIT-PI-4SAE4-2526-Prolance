package tn.esprit.microservice.subscriptionservice.subscription.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.Subscription;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.UserSubscription;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.BillingCycle;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionStatus;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.SubscribeRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.UserSubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.mapper.UserSubscriptionMapper;
import tn.esprit.microservice.subscriptionservice.subscription.repository.SubscriptionRepository;
import tn.esprit.microservice.subscriptionservice.subscription.repository.UserSubscriptionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import static tn.esprit.microservice.subscriptionservice.subscription.domain.enums.BillingCycle.SEMESTRIELLE;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserSubscriptionServiceImpl implements UserSubscriptionService {

    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UserSubscriptionMapper userSubscriptionMapper;

    @Override
    public UserSubscriptionResponse subscribe(SubscribeRequest request) {
        if (userSubscriptionRepository.existsByUserIdAndStatus(request.getUserId(), SubscriptionStatus.ACTIVE))
            throw new RuntimeException("Vous avez déjà un abonnement actif.");

        Subscription subscription = subscriptionRepository.findById(request.getSubscriptionId())
                .orElseThrow(() -> new RuntimeException("Plan non trouvé: " + request.getSubscriptionId()));

        if (!subscription.getIsActive())
            throw new RuntimeException("Ce plan n'est plus disponible.");

        UserSubscription us = new UserSubscription();
        us.setUserId(request.getUserId());
        us.setSubscription(subscription);
        us.setStatus(SubscriptionStatus.ACTIVE);
        us.setStartDate(LocalDateTime.now());
        us.setEndDate(calculateEndDate(LocalDateTime.now(), subscription.getBillingCycle()));
        us.setAutoRenew(request.getAutoRenew() != null ? request.getAutoRenew() : true);
        us.setCurrentProjects(0);
        us.setCurrentProposals(0);
        us.setAmountPaid(request.getAmountPaid() != null ? request.getAmountPaid() : subscription.getPrice());
        us.setPaymentMethod(request.getPaymentMethod());
        us.setTransactionId(request.getTransactionId());

        return userSubscriptionMapper.toResponse(userSubscriptionRepository.save(us));
    }

    @Override
    @Transactional(readOnly = true)
    public UserSubscriptionResponse getActiveSubscription(Long userId) {
        UserSubscription us = userSubscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Aucun abonnement actif pour l'utilisateur: " + userId));
        return userSubscriptionMapper.toResponse(us);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSubscriptionResponse> getUserSubscriptionHistory(Long userId) {
        return userSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(userSubscriptionMapper::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserSubscriptionResponse getUserSubscriptionById(Long id) {
        UserSubscription us = userSubscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Abonnement non trouvé: " + id));
        return userSubscriptionMapper.toResponse(us);
    }

    @Override
    public void cancelSubscription(Long userId) {
        UserSubscription us = userSubscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Aucun abonnement actif pour: " + userId));
        us.setStatus(SubscriptionStatus.CANCELLED);
        us.setCancelledAt(LocalDateTime.now());
        us.setAutoRenew(false);
        userSubscriptionRepository.save(us);
    }

    @Override
    public UserSubscriptionResponse renewSubscription(Long userId) {
        List<UserSubscription> history = userSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (history.isEmpty()) throw new RuntimeException("Aucun abonnement trouvé pour: " + userId);

        if (userSubscriptionRepository.existsByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE))
            throw new RuntimeException("Vous avez déjà un abonnement actif.");

        UserSubscription last = history.get(0);
        UserSubscription newUs = new UserSubscription();
        newUs.setUserId(userId);
        newUs.setSubscription(last.getSubscription());
        newUs.setStatus(SubscriptionStatus.ACTIVE);
        newUs.setStartDate(LocalDateTime.now());
        newUs.setEndDate(calculateEndDate(LocalDateTime.now(), last.getSubscription().getBillingCycle()));
        newUs.setAutoRenew(last.getAutoRenew());
        newUs.setCurrentProjects(0);
        newUs.setCurrentProposals(0);
        newUs.setAmountPaid(last.getSubscription().getPrice());

        return userSubscriptionMapper.toResponse(userSubscriptionRepository.save(newUs));
    }

    @Override
    public void toggleAutoRenew(Long userId, Boolean autoRenew) {
        UserSubscription us = userSubscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Aucun abonnement actif pour: " + userId));
        us.setAutoRenew(autoRenew);
        userSubscriptionRepository.save(us);
    }

    @Override
    public void incrementProjectCount(Long userId) {
        UserSubscription us = userSubscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Aucun abonnement actif"));
        Integer max = us.getSubscription().getMaxProjects();
        if (max != null && us.getCurrentProjects() >= max)
            throw new RuntimeException("Limite de projets atteinte.");
        us.setCurrentProjects(us.getCurrentProjects() + 1);
        userSubscriptionRepository.save(us);
    }

    @Override
    public void incrementProposalCount(Long userId) {
        UserSubscription us = userSubscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Aucun abonnement actif"));
        Integer max = us.getSubscription().getMaxProposals();
        if (max != null && us.getCurrentProposals() >= max)
            throw new RuntimeException("Limite de propositions atteinte.");
        us.setCurrentProposals(us.getCurrentProposals() + 1);
        userSubscriptionRepository.save(us);
    }

    @Override
    public void decrementProjectCount(Long userId) {
        UserSubscription us = userSubscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Aucun abonnement actif"));
        if (us.getCurrentProjects() > 0) {
            us.setCurrentProjects(us.getCurrentProjects() - 1);
            userSubscriptionRepository.save(us);
        }
    }

    @Override
    public void decrementProposalCount(Long userId) {
        UserSubscription us = userSubscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .orElseThrow(() -> new RuntimeException("Aucun abonnement actif"));
        if (us.getCurrentProposals() > 0) {
            us.setCurrentProposals(us.getCurrentProposals() - 1);
            userSubscriptionRepository.save(us);
        }
    }

    private LocalDateTime calculateEndDate(LocalDateTime start, BillingCycle cycle) {
        return switch (cycle) {
            case SEMESTRIELLE -> start.plusMonths(6);
            case ANNUELLE -> start.plusYears(1);
        };
    }
}