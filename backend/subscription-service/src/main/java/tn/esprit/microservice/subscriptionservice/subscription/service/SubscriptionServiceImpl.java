package tn.esprit.microservice.subscriptionservice.subscription.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.Subscription;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.CreateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.UpdateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.mapper.SubscriptionMapper;
import tn.esprit.microservice.subscriptionservice.subscription.repository.SubscriptionRepository;
import tn.esprit.microservice.subscriptionservice.subscription.repository.UserSubscriptionRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SubscriptionServiceImpl implements SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserSubscriptionRepository userSubscriptionRepository;
    private final SubscriptionMapper subscriptionMapper;

    @Override
    public SubscriptionResponse createSubscription(CreateSubscriptionRequest request) {
        if (subscriptionRepository.existsByName(request.getName()))
            throw new RuntimeException("Un plan avec ce nom existe déjà: " + request.getName());
        Subscription saved = subscriptionRepository.save(subscriptionMapper.toEntity(request));
        return subscriptionMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionResponse> getAllSubscriptions() {
        return subscriptionRepository.findAll().stream()
                .map(s -> {
                    SubscriptionResponse r = subscriptionMapper.toResponse(s);
                    r.setActiveSubscribersCount(userSubscriptionRepository.countActiveSubscriptionsByPlan(s.getId()));
                    return r;
                }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionResponse> getActiveSubscriptions() {
        return subscriptionRepository.findByIsActiveTrue().stream()
                .map(s -> {
                    SubscriptionResponse r = subscriptionMapper.toResponse(s);
                    r.setActiveSubscribersCount(userSubscriptionRepository.countActiveSubscriptionsByPlan(s.getId()));
                    return r;
                }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SubscriptionResponse> getSubscriptionsByType(SubscriptionType type) {
        return subscriptionRepository.findByTypeAndIsActiveTrue(type).stream()
                .map(s -> {
                    SubscriptionResponse r = subscriptionMapper.toResponse(s);
                    r.setActiveSubscribersCount(userSubscriptionRepository.countActiveSubscriptionsByPlan(s.getId()));
                    return r;
                }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SubscriptionResponse getSubscriptionById(Long id) {
        Subscription s = subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan non trouvé: " + id));
        SubscriptionResponse r = subscriptionMapper.toResponse(s);
        r.setActiveSubscribersCount(userSubscriptionRepository.countActiveSubscriptionsByPlan(id));
        return r;
    }

    @Override
    public SubscriptionResponse updateSubscription(Long id, UpdateSubscriptionRequest request) {
        Subscription s = subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan non trouvé: " + id));
        subscriptionMapper.updateEntity(s, request);
        return subscriptionMapper.toResponse(subscriptionRepository.save(s));
    }

    @Override
    public void deactivateSubscription(Long id) {
        Subscription s = subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan non trouvé: " + id));
        s.setIsActive(false);
        subscriptionRepository.save(s);
    }

    @Override
    public void activateSubscription(Long id) {
        Subscription s = subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plan non trouvé: " + id));
        s.setIsActive(true);
        subscriptionRepository.save(s);
    }

    @Override
    public void deleteSubscription(Long id) {
        Long activeCount = userSubscriptionRepository.countActiveSubscriptionsByPlan(id);
        if (activeCount > 0)
            throw new RuntimeException("Impossible de supprimer: " + activeCount + " abonnement(s) actif(s)");
        subscriptionRepository.deleteById(id);
    }
}