package com.esprit.microservice.adsservice.repositories;

import com.esprit.microservice.adsservice.entities.AdPlan;
import com.esprit.microservice.adsservice.entities.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdPlanRepository extends JpaRepository<AdPlan, Long> {
    List<AdPlan> findByRoleType(RoleType roleType);
}
