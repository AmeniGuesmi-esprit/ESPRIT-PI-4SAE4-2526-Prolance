package com.esprit.microservice.adsservice.services;

import com.esprit.microservice.adsservice.entities.AdLocation;
import com.esprit.microservice.adsservice.entities.AdPlan;
import com.esprit.microservice.adsservice.entities.AdType;
import com.esprit.microservice.adsservice.entities.RoleType;
import com.esprit.microservice.adsservice.exception.ResourceNotFoundException;
import com.esprit.microservice.adsservice.repositories.AdPlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdPlanServiceTest {

    @Mock
    private AdPlanRepository adPlanRepository;

    @InjectMocks
    private AdPlanService adPlanService;

    private AdPlan freelancerPlan;
    private AdPlan clientPlan;

    @BeforeEach
    void setUp() {
        freelancerPlan = AdPlan.builder()
                .id(1L)
                .name("Profile Spotlight")
                .type(AdType.FEATURED_PROFILE)
                .price(29.99)
                .location(AdLocation.JOB_FEED)
                .roleType(RoleType.FREELANCER)
                .description("Puts your profile at the top")
                .durationDays(30)
                .build();

        clientPlan = AdPlan.builder()
                .id(2L)
                .name("Featured Job")
                .type(AdType.JOB_BOOST)
                .price(34.99)
                .location(AdLocation.JOB_FEED)
                .roleType(RoleType.CLIENT)
                .description("Highlights your job post")
                .durationDays(30)
                .build();
    }

    @Test
    void getAllPlans_returnsAllPlans() {
        when(adPlanRepository.findAll()).thenReturn(List.of(freelancerPlan, clientPlan));

        List<AdPlan> result = adPlanService.getAllPlans();

        assertThat(result).hasSize(2);
    }

    @Test
    void getPlansByRole_freelancer_returnsFreelancerPlans() {
        when(adPlanRepository.findByRoleType(RoleType.FREELANCER)).thenReturn(List.of(freelancerPlan));

        List<AdPlan> result = adPlanService.getPlansByRole(RoleType.FREELANCER);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRoleType()).isEqualTo(RoleType.FREELANCER);
    }

    @Test
    void getPlansByRole_client_returnsClientPlans() {
        when(adPlanRepository.findByRoleType(RoleType.CLIENT)).thenReturn(List.of(clientPlan));

        List<AdPlan> result = adPlanService.getPlansByRole(RoleType.CLIENT);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRoleType()).isEqualTo(RoleType.CLIENT);
    }

    @Test
    void getPlanById_existingId_returnsPlan() {
        when(adPlanRepository.findById(1L)).thenReturn(Optional.of(freelancerPlan));

        AdPlan result = adPlanService.getPlanById(1L);

        assertThat(result).isEqualTo(freelancerPlan);
        assertThat(result.getName()).isEqualTo("Profile Spotlight");
    }

    @Test
    void getPlanById_nonExistingId_throwsResourceNotFoundException() {
        when(adPlanRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adPlanService.getPlanById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Ad plan not found with id: 99");
    }
}
