package tn.esprit.microservice.subscriptionservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.Subscription;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.BillingCycle;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.CreateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.UpdateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.mapper.SubscriptionMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class SubscriptionMapperTest {

    private SubscriptionMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new SubscriptionMapper();
    }

    @Test
    void toEntity_mapsAllFields() {
        CreateSubscriptionRequest req = new CreateSubscriptionRequest();
        req.setName("PRO");
        req.setType(SubscriptionType.FREELANCER);
        req.setPrice(new BigDecimal("19.99"));
        req.setBillingCycle(BillingCycle.ANNUELLE);
        req.setDescription("Plan Pro");
        req.setMaxProjects(10);
        req.setMaxProposals(20);
        req.setMaxActiveJobs(5);
        req.setFeaturedListing(true);
        req.setPrioritySupport(true);
        req.setAnalyticsAccess(false);

        Subscription result = mapper.toEntity(req);

        assertEquals("PRO", result.getName());
        assertEquals(SubscriptionType.FREELANCER, result.getType());
        assertEquals(new BigDecimal("19.99"), result.getPrice());
        assertEquals(BillingCycle.ANNUELLE, result.getBillingCycle());
        assertEquals("Plan Pro", result.getDescription());
        assertEquals(10, result.getMaxProjects());
        assertEquals(20, result.getMaxProposals());
        assertEquals(5, result.getMaxActiveJobs());
        assertTrue(result.getFeaturedListing());
        assertTrue(result.getPrioritySupport());
        assertFalse(result.getAnalyticsAccess());
        assertTrue(result.getIsActive());
    }

    @Test
    void toEntity_whenNullBooleans_defaultsToFalse() {
        CreateSubscriptionRequest req = new CreateSubscriptionRequest();
        req.setName("BASIC");
        req.setType(SubscriptionType.FREELANCER);
        req.setPrice(new BigDecimal("9.99"));
        req.setBillingCycle(BillingCycle.ANNUELLE);
        req.setFeaturedListing(null);
        req.setPrioritySupport(null);
        req.setAnalyticsAccess(null);

        Subscription result = mapper.toEntity(req);

        assertFalse(result.getFeaturedListing());
        assertFalse(result.getPrioritySupport());
        assertFalse(result.getAnalyticsAccess());
    }

    @Test
    void toResponse_mapsAllFields() {
        Subscription s = new Subscription();
        s.setId(1L);
        s.setName("PRO");
        s.setType(SubscriptionType.FREELANCER);
        s.setPrice(new BigDecimal("19.99"));
        s.setBillingCycle(BillingCycle.ANNUELLE);
        s.setDescription("Plan Pro");
        s.setMaxProjects(10);
        s.setMaxProposals(20);
        s.setMaxActiveJobs(5);
        s.setFeaturedListing(true);
        s.setPrioritySupport(true);
        s.setAnalyticsAccess(true);
        s.setIsActive(true);
        LocalDateTime now = LocalDateTime.now();
        s.setCreatedAt(now);
        s.setUpdatedAt(now);

        SubscriptionResponse result = mapper.toResponse(s);

        assertEquals(1L, result.getId());
        assertEquals("PRO", result.getName());
        assertEquals(SubscriptionType.FREELANCER, result.getType());
        assertEquals(new BigDecimal("19.99"), result.getPrice());
        assertEquals(BillingCycle.ANNUELLE, result.getBillingCycle());
        assertEquals("Plan Pro", result.getDescription());
        assertEquals(10, result.getMaxProjects());
        assertTrue(result.getFeaturedListing());
        assertTrue(result.getIsActive());
        assertEquals(now, result.getCreatedAt());
    }

    @Test
    void updateEntity_whenAllFieldsProvided_updatesAll() {
        Subscription s = new Subscription();
        s.setName("OLD");
        s.setPrice(new BigDecimal("10.00"));

        UpdateSubscriptionRequest req = new UpdateSubscriptionRequest();
        req.setName("NEW");
        req.setType(SubscriptionType.CLIENT);
        req.setPrice(new BigDecimal("25.00"));
        req.setBillingCycle(BillingCycle.SEMESTRIELLE);
        req.setDescription("Nouvelle description");
        req.setMaxProjects(50);
        req.setMaxProposals(100);
        req.setMaxActiveJobs(10);
        req.setFeaturedListing(true);
        req.setPrioritySupport(true);
        req.setAnalyticsAccess(true);
        req.setIsActive(false);

        mapper.updateEntity(s, req);

        assertEquals("NEW", s.getName());
        assertEquals(SubscriptionType.CLIENT, s.getType());
        assertEquals(new BigDecimal("25.00"), s.getPrice());
        assertEquals(BillingCycle.SEMESTRIELLE, s.getBillingCycle());
        assertEquals("Nouvelle description", s.getDescription());
        assertEquals(50, s.getMaxProjects());
        assertTrue(s.getFeaturedListing());
        assertFalse(s.getIsActive());
    }

    @Test
    void updateEntity_whenNullFields_keepsOriginalValues() {
        Subscription s = new Subscription();
        s.setName("ORIGINAL");
        s.setPrice(new BigDecimal("15.00"));
        s.setIsActive(true);

        UpdateSubscriptionRequest req = new UpdateSubscriptionRequest();

        mapper.updateEntity(s, req);

        assertEquals("ORIGINAL", s.getName());
        assertEquals(new BigDecimal("15.00"), s.getPrice());
        assertTrue(s.getIsActive());
    }
}
