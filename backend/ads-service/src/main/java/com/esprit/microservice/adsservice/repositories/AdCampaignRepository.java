package com.esprit.microservice.adsservice.repositories;

import com.esprit.microservice.adsservice.entities.AdCampaign;
import com.esprit.microservice.adsservice.entities.AdStatus;
import com.esprit.microservice.adsservice.entities.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdCampaignRepository extends JpaRepository<AdCampaign, Long> {
    List<AdCampaign> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<AdCampaign> findByUserIdAndRoleTypeOrderByCreatedAtDesc(Long userId, RoleType roleType);
    List<AdCampaign> findByStatusOrderByCreatedAtDesc(AdStatus status);
    List<AdCampaign> findAllByOrderByCreatedAtDesc();
}
