package tn.esprit.microservice.subscriptionservice.subscription.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.Subscription;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;

import java.util.List;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    List<Subscription> findByIsActiveTrue();
    List<Subscription> findByTypeAndIsActiveTrue(SubscriptionType type);
    boolean existsByName(String name);
}