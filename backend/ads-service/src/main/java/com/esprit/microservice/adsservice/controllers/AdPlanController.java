package com.esprit.microservice.adsservice.controllers;

import com.esprit.microservice.adsservice.entities.AdPlan;
import com.esprit.microservice.adsservice.entities.RoleType;
import com.esprit.microservice.adsservice.services.AdPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/plans")
@RequiredArgsConstructor
public class AdPlanController {

    private final AdPlanService adPlanService;

    @GetMapping
    public ResponseEntity<List<AdPlan>> getAllPlans() {
        return ResponseEntity.ok(adPlanService.getAllPlans());
    }

    @GetMapping("/role/{roleType}")
    public ResponseEntity<List<AdPlan>> getPlansByRole(@PathVariable String roleType) {
        RoleType type = RoleType.valueOf(roleType.toUpperCase());
        return ResponseEntity.ok(adPlanService.getPlansByRole(type));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdPlan> getPlanById(@PathVariable Long id) {
        return ResponseEntity.ok(adPlanService.getPlanById(id));
    }
}
