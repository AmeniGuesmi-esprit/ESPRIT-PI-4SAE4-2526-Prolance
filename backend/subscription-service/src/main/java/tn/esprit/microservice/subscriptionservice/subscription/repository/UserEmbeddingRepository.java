package tn.esprit.microservice.subscriptionservice.subscription.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.UserEmbedding;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserEmbeddingRepository extends JpaRepository<UserEmbedding, Long> {

    Optional<UserEmbedding> findByUserId(Long userId);

    List<UserEmbedding> findByUserType(String userType);

    List<UserEmbedding> findByUserTypeAndPlanTier(String userType, String planTier);

    List<UserEmbedding> findByUserTypeAndPlanTierIn(String userType, List<String> planTiers);

    List<UserEmbedding> findByUsageLevel(String usageLevel);

    boolean existsByUserId(Long userId);

    void deleteByUserId(Long userId);
}