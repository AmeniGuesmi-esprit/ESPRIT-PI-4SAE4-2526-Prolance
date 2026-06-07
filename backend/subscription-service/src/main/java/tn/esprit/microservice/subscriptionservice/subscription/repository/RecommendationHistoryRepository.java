package tn.esprit.microservice.subscriptionservice.subscription.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.RecommendationHistory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecommendationHistoryRepository extends JpaRepository<RecommendationHistory, Long> {

    List<RecommendationHistory> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<RecommendationHistory> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    List<RecommendationHistory> findByUserIdAndUserAction(Long userId, RecommendationHistory.UserAction action);

    @Query("SELECT r FROM RecommendationHistory r WHERE r.userId = :userId AND r.createdAt > :since ORDER BY r.createdAt DESC")
    List<RecommendationHistory> findRecentByUserId(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(r) FROM RecommendationHistory r WHERE r.userAction = 'UPGRADED'")
    Long countConversions();

    @Query("SELECT AVG(r.confidenceScore) FROM RecommendationHistory r WHERE r.createdAt > :since")
    Double getAverageConfidenceScore(@Param("since") LocalDateTime since);

    @Query("SELECT AVG(r.feedbackScore) FROM RecommendationHistory r WHERE r.feedbackScore IS NOT NULL AND r.createdAt > :since")
    Double getAverageFeedbackScore(@Param("since") LocalDateTime since);

    List<RecommendationHistory> findByCreatedAtAfter(LocalDateTime since);
}