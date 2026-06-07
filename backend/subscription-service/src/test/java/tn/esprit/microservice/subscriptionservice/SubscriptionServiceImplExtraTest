package tn.esprit.microservice.subscriptionservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.Subscription;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.BillingCycle;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.UpdateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.mapper.SubscriptionMapper;
import tn.esprit.microservice.subscriptionservice.subscription.repository.SubscriptionRepository;
import tn.esprit.microservice.subscriptionservice.subscription.repository.UserSubscriptionRepository;
import tn.esprit.microservice.subscriptionservice.subscription.service.SubscriptionServiceImpl;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceImplExtraTest {

    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private UserSubscriptionRepository userSubscriptionRepository;
    @Mock private SubscriptionMapper subscriptionMapper;

    @InjectMocks
    private SubscriptionServiceImpl subscriptionService;

    private Subscription plan;
    private SubscriptionResponse planResponse;

    @BeforeEach
    void setUp() {
        plan = new Subscription();
        plan.setId(1L);
        plan.setName("PRO");
        plan.setType(SubscriptionType.FREELANCER);
        plan.setPrice(new BigDecimal("29.99"));
        plan.setBillingCycle(BillingCycle.ANNUELLE);
        plan.setIsActive(true);

        planResponse = new SubscriptionResponse();
        planResponse.setId(1L);
        planResponse.setName("PRO");
    }

    // ========== updateSubscription ==========

    @Test
    void updateSubscription_whenExists_updatesAndReturnsResponse() {
        UpdateSubscriptionRequest req = new UpdateSubscriptionRequest();
        req.setName("PRO+");
        req.setPrice(new BigDecimal("39.99"));

        when(subscriptionRepository.findById(1L)).thenReturn(Optional.of(plan));
        doNothing().when(subscriptionMapper).updateEntity(plan, req);
        when(subscriptionRepository.save(plan)).thenReturn(plan);
        when(subscriptionMapper.toResponse(plan)).thenReturn(planResponse);

        SubscriptionResponse result = subscriptionService.updateSubscription(1L, req);

        assertNotNull(result);
        verify(subscriptionMapper).updateEntity(plan, req);
        verify(subscriptionRepository).save(plan);
    }

    @Test
    void updateSubscription_whenNotFound_throwsException() {
        when(subscriptionRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> subscriptionService.updateSubscription(999L, new UpdateSubscriptionRequest()));

        assertTrue(ex.getMessage().contains("Plan non trouvé"));
        verify(subscriptionRepository, never()).save(any());
    }

    // ========== deactivateSubscription - not found ==========

    @Test
    void deactivateSubscription_whenNotFound_throwsException() {
        when(subscriptionRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> subscriptionService.deactivateSubscription(999L));

        assertTrue(ex.getMessage().contains("Plan non trouvé"));
        verify(subscriptionRepository, never()).save(any());
    }

    // ========== activateSubscription - not found ==========

    @Test
    void activateSubscription_whenNotFound_throwsException() {
        when(subscriptionRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> subscriptionService.activateSubscription(999L));

        assertTrue(ex.getMessage().contains("Plan non trouvé"));
        verify(subscriptionRepository, never()).save(any());
    }

    // ========== getActiveSubscriptions - empty list ==========

    @Test
    void getActiveSubscriptions_whenEmpty_returnsEmptyList() {
        when(subscriptionRepository.findByIsActiveTrue()).thenReturn(java.util.Collections.emptyList());

        java.util.List<SubscriptionResponse> result = subscriptionService.getActiveSubscriptions();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ========== getSubscriptionsByType - CLIENT type ==========

    @Test
    void getSubscriptionsByType_forClientType_callsCorrectRepo() {
        when(subscriptionRepository.findByTypeAndIsActiveTrue(SubscriptionType.CLIENT))
                .thenReturn(java.util.Collections.emptyList());

        java.util.List<SubscriptionResponse> result =
                subscriptionService.getSubscriptionsByType(SubscriptionType.CLIENT);

        assertNotNull(result);
        verify(subscriptionRepository).findByTypeAndIsActiveTrue(SubscriptionType.CLIENT);
    }

    // ========== deleteSubscription - exactly 0 active ==========

    @Test
    void deleteSubscription_withZeroActiveUsers_callsDeleteById() {
        when(userSubscriptionRepository.countActiveSubscriptionsByPlan(1L)).thenReturn(0L);

        assertDoesNotThrow(() -> subscriptionService.deleteSubscription(1L));

        verify(subscriptionRepository).deleteById(1L);
    }

    // ========== deleteSubscription - message contains count ==========

    @Test
    void deleteSubscription_exceptionMessageContainsActiveCount() {
        when(userSubscriptionRepository.countActiveSubscriptionsByPlan(1L)).thenReturn(5L);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> subscriptionService.deleteSubscription(1L));

        assertTrue(ex.getMessage().contains("5"));
    }
}