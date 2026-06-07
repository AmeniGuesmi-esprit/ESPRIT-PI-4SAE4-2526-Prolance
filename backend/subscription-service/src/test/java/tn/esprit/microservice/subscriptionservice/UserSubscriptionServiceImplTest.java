package tn.esprit.microservice.subscriptionservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.Subscription;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.UserSubscription;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.BillingCycle;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionStatus;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.SubscribeRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.UserSubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.mapper.UserSubscriptionMapper;
import tn.esprit.microservice.subscriptionservice.subscription.repository.SubscriptionRepository;
import tn.esprit.microservice.subscriptionservice.subscription.repository.UserSubscriptionRepository;
import tn.esprit.microservice.subscriptionservice.subscription.service.UserSubscriptionServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserSubscriptionServiceImplTest {

    @Mock private UserSubscriptionRepository userSubscriptionRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private UserSubscriptionMapper userSubscriptionMapper;

    @InjectMocks
    private UserSubscriptionServiceImpl service;

    private Subscription plan;
    private UserSubscription userSub;
    private UserSubscriptionResponse response;
    private SubscribeRequest request;

    @BeforeEach
    void setUp() {
        plan = new Subscription();
        plan.setId(10L);
        plan.setName("PRO");
        plan.setPrice(new BigDecimal("29.99"));
        plan.setBillingCycle(BillingCycle.ANNUELLE);
        plan.setIsActive(true);
        plan.setMaxProjects(10);
        plan.setMaxProposals(20);

        userSub = new UserSubscription();
        userSub.setId(1L);
        userSub.setUserId(100L);
        userSub.setSubscription(plan);
        userSub.setStatus(SubscriptionStatus.ACTIVE);
        userSub.setCurrentProjects(0);
        userSub.setCurrentProposals(0);
        userSub.setStartDate(LocalDateTime.now());
        userSub.setEndDate(LocalDateTime.now().plusYears(1));
        userSub.setAutoRenew(true);

        response = new UserSubscriptionResponse();
        response.setId(1L);
        response.setUserId(100L);

        request = new SubscribeRequest();
        request.setUserId(100L);
        request.setSubscriptionId(10L);
        request.setAutoRenew(true);
        request.setAmountPaid(new BigDecimal("29.99"));
        request.setPaymentMethod("CARD");
        request.setTransactionId("TX123");
    }

    // ========== subscribe ==========
    @Test
    void subscribe_whenNoActiveAndPlanExists_createsSubscription() {
        when(userSubscriptionRepository.existsByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(false);
        when(subscriptionRepository.findById(10L)).thenReturn(Optional.of(plan));
        when(userSubscriptionRepository.save(any(UserSubscription.class)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(userSubscriptionMapper.toResponse(any(UserSubscription.class)))
            .thenReturn(response);

        UserSubscriptionResponse result = service.subscribe(request);

        assertNotNull(result);
        verify(userSubscriptionRepository).save(any(UserSubscription.class));
    }

    @Test
    void subscribe_whenAlreadyActive_throwsException() {
        when(userSubscriptionRepository.existsByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> service.subscribe(request));

        assertTrue(ex.getMessage().contains("déjà un abonnement actif"));
    }

    @Test
    void subscribe_whenPlanNotFound_throwsException() {
        when(userSubscriptionRepository.existsByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(false);
        when(subscriptionRepository.findById(10L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> service.subscribe(request));

        assertTrue(ex.getMessage().contains("Plan non trouvé"));
    }

    @Test
    void subscribe_whenPlanInactive_throwsException() {
        plan.setIsActive(false);
        when(userSubscriptionRepository.existsByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(false);
        when(subscriptionRepository.findById(10L)).thenReturn(Optional.of(plan));

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> service.subscribe(request));

        assertTrue(ex.getMessage().contains("n'est plus disponible"));
    }

    // ========== getActiveSubscription ==========
    @Test
    void getActiveSubscription_whenExists_returnsResponse() {
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));
        when(userSubscriptionMapper.toResponse(userSub)).thenReturn(response);

        UserSubscriptionResponse result = service.getActiveSubscription(100L);

        assertNotNull(result);
        assertEquals(100L, result.getUserId());
    }

    @Test
    void getActiveSubscription_whenNoActive_throwsException() {
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> service.getActiveSubscription(100L));

        assertTrue(ex.getMessage().contains("Aucun abonnement actif"));
    }

    // ========== getUserSubscriptionHistory ==========
    @Test
    void getUserSubscriptionHistory_returnsList() {
        when(userSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(100L))
            .thenReturn(Arrays.asList(userSub, userSub));
        when(userSubscriptionMapper.toResponse(any())).thenReturn(response);

        List<UserSubscriptionResponse> result = service.getUserSubscriptionHistory(100L);

        assertEquals(2, result.size());
    }

    // ========== getUserSubscriptionById ==========
    @Test
    void getUserSubscriptionById_whenExists_returnsResponse() {
        when(userSubscriptionRepository.findById(1L)).thenReturn(Optional.of(userSub));
        when(userSubscriptionMapper.toResponse(userSub)).thenReturn(response);

        UserSubscriptionResponse result = service.getUserSubscriptionById(1L);

        assertNotNull(result);
    }

    @Test
    void getUserSubscriptionById_whenNotFound_throwsException() {
        when(userSubscriptionRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> service.getUserSubscriptionById(999L));

        assertTrue(ex.getMessage().contains("Abonnement non trouvé"));
    }

    // ========== cancelSubscription ==========
    @Test
    void cancelSubscription_setsStatusCancelled() {
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        service.cancelSubscription(100L);

        assertEquals(SubscriptionStatus.CANCELLED, userSub.getStatus());
        assertNotNull(userSub.getCancelledAt());
        assertFalse(userSub.getAutoRenew());
        verify(userSubscriptionRepository).save(userSub);
    }

    @Test
    void cancelSubscription_whenNoActive_throwsException() {
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.cancelSubscription(100L));
    }

    // ========== renewSubscription ==========
    @Test
    void renewSubscription_createsNewActiveSub() {
        UserSubscription lastSub = new UserSubscription();
        lastSub.setSubscription(plan);
        lastSub.setAutoRenew(true);

        when(userSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(100L))
            .thenReturn(Arrays.asList(lastSub));
        when(userSubscriptionRepository.existsByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(false);
        when(userSubscriptionRepository.save(any(UserSubscription.class)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(userSubscriptionMapper.toResponse(any())).thenReturn(response);

        UserSubscriptionResponse result = service.renewSubscription(100L);

        assertNotNull(result);
        verify(userSubscriptionRepository).save(any(UserSubscription.class));
    }

    @Test
    void renewSubscription_whenNoHistory_throwsException() {
        when(userSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(100L))
            .thenReturn(Arrays.asList());

        assertThrows(RuntimeException.class, () -> service.renewSubscription(100L));
    }

    @Test
    void renewSubscription_whenAlreadyActive_throwsException() {
        UserSubscription lastSub = new UserSubscription();
        lastSub.setSubscription(plan);

        when(userSubscriptionRepository.findByUserIdOrderByCreatedAtDesc(100L))
            .thenReturn(Arrays.asList(lastSub));
        when(userSubscriptionRepository.existsByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(true);

        assertThrows(RuntimeException.class, () -> service.renewSubscription(100L));
    }

    // ========== toggleAutoRenew ==========
    @Test
    void toggleAutoRenew_updatesField() {
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        service.toggleAutoRenew(100L, false);

        assertFalse(userSub.getAutoRenew());
        verify(userSubscriptionRepository).save(userSub);
    }

    // ========== incrementProjectCount ==========
    @Test
    void incrementProjectCount_underLimit_increments() {
        userSub.setCurrentProjects(5);
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        service.incrementProjectCount(100L);

        assertEquals(6, userSub.getCurrentProjects());
        verify(userSubscriptionRepository).save(userSub);
    }

    @Test
    void incrementProjectCount_atLimit_throwsException() {
        userSub.setCurrentProjects(10);
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> service.incrementProjectCount(100L));

        assertTrue(ex.getMessage().contains("Limite de projets"));
    }

    // ========== incrementProposalCount ==========
    @Test
    void incrementProposalCount_underLimit_increments() {
        userSub.setCurrentProposals(5);
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        service.incrementProposalCount(100L);

        assertEquals(6, userSub.getCurrentProposals());
    }

    @Test
    void incrementProposalCount_atLimit_throwsException() {
        userSub.setCurrentProposals(20);
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        assertThrows(RuntimeException.class, () -> service.incrementProposalCount(100L));
    }

    // ========== decrementProjectCount ==========
    @Test
    void decrementProjectCount_whenPositive_decrements() {
        userSub.setCurrentProjects(3);
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        service.decrementProjectCount(100L);

        assertEquals(2, userSub.getCurrentProjects());
        verify(userSubscriptionRepository).save(userSub);
    }

    @Test
    void decrementProjectCount_whenZero_doesNothing() {
        userSub.setCurrentProjects(0);
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        service.decrementProjectCount(100L);

        assertEquals(0, userSub.getCurrentProjects());
        verify(userSubscriptionRepository, never()).save(any());
    }

    // ========== decrementProposalCount ==========
    @Test
    void decrementProposalCount_whenPositive_decrements() {
        userSub.setCurrentProposals(5);
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        service.decrementProposalCount(100L);

        assertEquals(4, userSub.getCurrentProposals());
    }

    @Test
    void decrementProposalCount_whenZero_doesNothing() {
        userSub.setCurrentProposals(0);
        when(userSubscriptionRepository.findByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(Optional.of(userSub));

        service.decrementProposalCount(100L);

        verify(userSubscriptionRepository, never()).save(any());
    }

    // ========== Test billing cycles ==========
    @Test
    void subscribe_withSemestrielleBilling_works() {
        plan.setBillingCycle(BillingCycle.SEMESTRIELLE);
        when(userSubscriptionRepository.existsByUserIdAndStatus(100L, SubscriptionStatus.ACTIVE))
            .thenReturn(false);
        when(subscriptionRepository.findById(10L)).thenReturn(Optional.of(plan));
        when(userSubscriptionRepository.save(any(UserSubscription.class)))
            .thenAnswer(inv -> inv.getArgument(0));
        when(userSubscriptionMapper.toResponse(any())).thenReturn(response);

        UserSubscriptionResponse result = service.subscribe(request);

        assertNotNull(result);
    }
}
