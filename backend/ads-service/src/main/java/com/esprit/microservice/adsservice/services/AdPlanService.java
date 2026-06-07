package com.esprit.microservice.adsservice.services;

import com.esprit.microservice.adsservice.entities.AdPlan;
import com.esprit.microservice.adsservice.entities.RoleType;
import com.esprit.microservice.adsservice.exception.ResourceNotFoundException;
import com.esprit.microservice.adsservice.repositories.AdPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdPlanService {

    private final AdPlanRepository adPlanRepository;

    public List<AdPlan> getAllPlans() {
        return adPlanRepository.findAll();
    }

    public List<AdPlan> getPlansByRole(RoleType roleType) {
        return adPlanRepository.findByRoleType(roleType);
    }

    public AdPlan getPlanById(Long id) {
        return adPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ad plan not found with id: " + id));
    }
}
