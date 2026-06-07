package tn.esprit.microservice.subscriptionservice.subscription.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.UserSubscription;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, Long> {
    Optional<UserSubscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);
    boolean existsByUserIdAndStatus(Long userId, SubscriptionStatus status);
    List<UserSubscription> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT COUNT(us) FROM UserSubscription us WHERE us.subscription.id = :planId AND us.status = 'ACTIVE'")
    Long countActiveSubscriptionsByPlan(Long planId);

    @Query("SELECT us FROM UserSubscription us WHERE us.status = 'ACTIVE' AND us.endDate < :now")
    List<UserSubscription> findExpiredSubscriptions(LocalDateTime now);
}