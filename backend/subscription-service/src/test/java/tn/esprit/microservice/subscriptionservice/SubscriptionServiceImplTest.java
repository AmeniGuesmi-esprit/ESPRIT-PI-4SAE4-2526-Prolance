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
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.CreateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.mapper.SubscriptionMapper;
import tn.esprit.microservice.subscriptionservice.subscription.repository.SubscriptionRepository;
import tn.esprit.microservice.subscriptionservice.subscription.repository.UserSubscriptionRepository;
import tn.esprit.microservice.subscriptionservice.subscription.service.SubscriptionServiceImpl;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceImplTest {

    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private UserSubscriptionRepository userSubscriptionRepository;
    @Mock private SubscriptionMapper subscriptionMapper;

    @InjectMocks
    private SubscriptionServiceImpl subscriptionService;

    private Subscription plan;
    private SubscriptionResponse planResponse;
    private CreateSubscriptionRequest createRequest;

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

        createRequest = new CreateSubscriptionRequest();
        createRequest.setName("PRO");
    }

    @Test
    void createSubscription_whenNameIsUnique_returnsResponse() {
        when(subscriptionRepository.existsByName("PRO")).thenReturn(false);
        when(subscriptionMapper.toEntity(createRequest)).thenReturn(plan);
        when(subscriptionRepository.save(plan)).thenReturn(plan);
        when(subscriptionMapper.toResponse(plan)).thenReturn(planResponse);

        SubscriptionResponse result = subscriptionService.createSubscription(createRequest);

        assertNotNull(result);
        assertEquals("PRO", result.getName());
        verify(subscriptionRepository).save(plan);
    }

    @Test
    void createSubscription_whenNameExists_throwsException() {
        when(subscriptionRepository.existsByName("PRO")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> subscriptionService.createSubscription(createRequest));

        assertTrue(ex.getMessage().contains("existe déjà"));
        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void getAllSubscriptions_returnsAllPlansWithSubscribersCount() {
        when(subscriptionRepository.findAll()).thenReturn(Arrays.asList(plan));
        when(subscriptionMapper.toResponse(plan)).thenReturn(planResponse);
        when(userSubscriptionRepository.countActiveSubscriptionsByPlan(1L)).thenReturn(42L);

        List<SubscriptionResponse> result = subscriptionService.getAllSubscriptions();

        assertEquals(1, result.size());
        assertEquals(42L, result.get(0).getActiveSubscribersCount());
    }

    @Test
    void getActiveSubscriptions_returnsOnlyActivePlans() {
        when(subscriptionRepository.findByIsActiveTrue()).thenReturn(Arrays.asList(plan));
        when(subscriptionMapper.toResponse(plan)).thenReturn(planResponse);
        when(userSubscriptionRepository.countActiveSubscriptionsByPlan(anyLong())).thenReturn(10L);

        List<SubscriptionResponse> result = subscriptionService.getActiveSubscriptions();

        assertEquals(1, result.size());
        verify(subscriptionRepository).findByIsActiveTrue();
    }

    @Test
    void getSubscriptionsByType_filtersByType() {
        when(subscriptionRepository.findByTypeAndIsActiveTrue(SubscriptionType.FREELANCER))
            .thenReturn(Arrays.asList(plan));
        when(subscriptionMapper.toResponse(plan)).thenReturn(planResponse);
        when(userSubscriptionRepository.countActiveSubscriptionsByPlan(anyLong())).thenReturn(5L);

        List<SubscriptionResponse> result =
            subscriptionService.getSubscriptionsByType(SubscriptionType.FREELANCER);

        assertEquals(1, result.size());
        verify(subscriptionRepository).findByTypeAndIsActiveTrue(SubscriptionType.FREELANCER);
    }

    @Test
    void getSubscriptionById_whenExists_returnsResponse() {
        when(subscriptionRepository.findById(1L)).thenReturn(Optional.of(plan));
        when(subscriptionMapper.toResponse(plan)).thenReturn(planResponse);
        when(userSubscriptionRepository.countActiveSubscriptionsByPlan(1L)).thenReturn(100L);

        SubscriptionResponse result = subscriptionService.getSubscriptionById(1L);

        assertNotNull(result);
        assertEquals(100L, result.getActiveSubscribersCount());
    }

    @Test
    void getSubscriptionById_whenNotFound_throwsException() {
        when(subscriptionRepository.findById(99L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> subscriptionService.getSubscriptionById(99L));

        assertTrue(ex.getMessage().contains("non trouvé"));
    }

    @Test
    void deactivateSubscription_setsIsActiveFalse() {
        when(subscriptionRepository.findById(1L)).thenReturn(Optional.of(plan));

        subscriptionService.deactivateSubscription(1L);

        assertFalse(plan.getIsActive());
        verify(subscriptionRepository).save(plan);
    }

    @Test
    void activateSubscription_setsIsActiveTrue() {
        plan.setIsActive(false);
        when(subscriptionRepository.findById(1L)).thenReturn(Optional.of(plan));

        subscriptionService.activateSubscription(1L);

        assertTrue(plan.getIsActive());
        verify(subscriptionRepository).save(plan);
    }

    @Test
    void deleteSubscription_whenNoActiveSubscribers_deletes() {
        when(userSubscriptionRepository.countActiveSubscriptionsByPlan(1L)).thenReturn(0L);

        subscriptionService.deleteSubscription(1L);

        verify(subscriptionRepository).deleteById(1L);
    }

    @Test
    void deleteSubscription_whenActiveSubscribersExist_throwsException() {
        when(userSubscriptionRepository.countActiveSubscriptionsByPlan(1L)).thenReturn(3L);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> subscriptionService.deleteSubscription(1L));

        assertTrue(ex.getMessage().contains("Impossible de supprimer"));
        verify(subscriptionRepository, never()).deleteById(anyLong());
    }
}
