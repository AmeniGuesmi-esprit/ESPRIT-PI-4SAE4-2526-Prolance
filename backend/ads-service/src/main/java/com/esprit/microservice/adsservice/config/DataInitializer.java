package com.esprit.microservice.adsservice.config;

import com.esprit.microservice.adsservice.entities.AdLocation;
import com.esprit.microservice.adsservice.entities.AdPlan;
import com.esprit.microservice.adsservice.entities.AdType;
import com.esprit.microservice.adsservice.entities.RoleType;
import com.esprit.microservice.adsservice.repositories.AdPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final AdPlanRepository adPlanRepository;

    @Override
    public void run(String... args) {
        if (adPlanRepository.count() == 0) {
            log.info("Initializing default Ad Plans...");

            List<AdPlan> plans = List.of(
                    // ── Freelancer Plans ──
                    AdPlan.builder()
                            .name("Profile Spotlight")
                            .type(AdType.FEATURED_PROFILE)
                            .price(29.99)
                            .location(AdLocation.JOB_FEED)
                            .roleType(RoleType.FREELANCER)
                            .description("Puts your profile at the top of search results with a highlighted border.")
                            .icon("person_pin")
                            .durationDays(30)
                            .build(),
                    AdPlan.builder()
                            .name("Landing Page Banner")
                            .type(AdType.BANNER)
                            .price(49.99)
                            .location(AdLocation.LANDING_PAGE)
                            .roleType(RoleType.FREELANCER)
                            .description("High-visibility graphic banner on the main landing page.")
                            .icon("panorama")
                            .durationDays(30)
                            .build(),
                    AdPlan.builder()
                            .name("Sidebar Showcase")
                            .type(AdType.BANNER)
                            .price(19.99)
                            .location(AdLocation.SEARCH_SIDEBAR)
                            .roleType(RoleType.FREELANCER)
                            .description("Compact banner displayed in the sidebar across all pages.")
                            .icon("view_sidebar")
                            .durationDays(30)
                            .build(),

                    // ── Client Plans ──
                    AdPlan.builder()
                            .name("Featured Job")
                            .type(AdType.JOB_BOOST)
                            .price(34.99)
                            .location(AdLocation.JOB_FEED)
                            .roleType(RoleType.CLIENT)
                            .description("Highlights your job post with a special color and badge in the feed.")
                            .icon("work_outline")
                            .durationDays(30)
                            .build(),
                    AdPlan.builder()
                            .name("Job Feed Banner")
                            .type(AdType.BANNER)
                            .price(44.99)
                            .location(AdLocation.JOB_FEED)
                            .roleType(RoleType.CLIENT)
                            .description("Large banner displayed at the top of the job feed.")
                            .icon("featured_video")
                            .durationDays(30)
                            .build(),
                    AdPlan.builder()
                            .name("Landing Page Banner")
                            .type(AdType.BANNER)
                            .price(49.99)
                            .location(AdLocation.LANDING_PAGE)
                            .roleType(RoleType.CLIENT)
                            .description("High-visibility graphic banner on the main landing page.")
                            .icon("panorama")
                            .durationDays(30)
                            .build()
            );

            adPlanRepository.saveAll(plans);
            log.info("Initialized {} Ad Plans successfully.", plans.size());
        } else {
            log.info("Ad Plans already exist. Skipping initialization.");
        }
    }
}
