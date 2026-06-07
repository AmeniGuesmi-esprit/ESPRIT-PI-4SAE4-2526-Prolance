package com.esprit.microservice.adsservice.controllers;

import com.esprit.microservice.adsservice.entities.AdLocation;
import com.esprit.microservice.adsservice.entities.AdPlan;
import com.esprit.microservice.adsservice.entities.AdType;
import com.esprit.microservice.adsservice.entities.RoleType;
import com.esprit.microservice.adsservice.services.AdPlanService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdPlanControllerTest {

    @Mock
    private AdPlanService adPlanService;

    @InjectMocks
    private AdPlanController controller;

    private AdPlan testPlan;

    @BeforeEach
    void setUp() {
        testPlan = AdPlan.builder()
                .id(1L)
                .name("Profile Spotlight")
                .type(AdType.FEATURED_PROFILE)
                .price(29.99)
                .location(AdLocation.JOB_FEED)
                .roleType(RoleType.FREELANCER)
                .durationDays(30)
                .build();
    }

    @Test
    void getAllPlans_returnsOk() {
        when(adPlanService.getAllPlans()).thenReturn(List.of(testPlan));

        ResponseEntity<List<AdPlan>> response = controller.getAllPlans();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void getPlansByRole_returnsOk() {
        when(adPlanService.getPlansByRole(RoleType.FREELANCER)).thenReturn(List.of(testPlan));

        ResponseEntity<List<AdPlan>> response = controller.getPlansByRole("freelancer");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void getPlansByRole_uppercase_returnsOk() {
        when(adPlanService.getPlansByRole(RoleType.CLIENT)).thenReturn(List.of());

        ResponseEntity<List<AdPlan>> response = controller.getPlansByRole("CLIENT");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void getPlanById_returnsOk() {
        when(adPlanService.getPlanById(1L)).thenReturn(testPlan);

        ResponseEntity<AdPlan> response = controller.getPlanById(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getName()).isEqualTo("Profile Spotlight");
    }
}
