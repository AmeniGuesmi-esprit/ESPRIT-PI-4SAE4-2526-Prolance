package tn.esprit.microservice.subscriptionservice.subscription.mapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tn.esprit.microservice.subscriptionservice.subscription.client.UserClient;
import tn.esprit.microservice.subscriptionservice.subscription.client.UserDTO;
import tn.esprit.microservice.subscriptionservice.subscription.domain.entities.UserSubscription;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.UserSubscriptionResponse;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserSubscriptionMapper {

    private final UserClient userClient;
    private final SubscriptionMapper subscriptionMapper;

    public UserSubscriptionResponse toResponse(UserSubscription us) {
        UserSubscriptionResponse r = new UserSubscriptionResponse();
        r.setId(us.getId());
        r.setUserId(us.getUserId());

        // Appel Feign vers user-service pour récupérer les infos user
        try {
            UserDTO user = userClient.getUserById(us.getUserId().intValue());
            if (user != null) {
                r.setUserName(user.getName() + " " + user.getLastName());
                r.setUserEmail(user.getEmail());
            }
        } catch (Exception e) {
            log.warn("Impossible de récupérer l'utilisateur {}: {}", us.getUserId(), e.getMessage());
            r.setUserName("User #" + us.getUserId());
        }

        r.setSubscription(subscriptionMapper.toResponse(us.getSubscription()));
        r.setStatus(us.getStatus());
        r.setStartDate(us.getStartDate());
        r.setEndDate(us.getEndDate());
        r.setCancelledAt(us.getCancelledAt());
        r.setAutoRenew(us.getAutoRenew());
        r.setCurrentProjects(us.getCurrentProjects());
        r.setCurrentProposals(us.getCurrentProposals());
        r.setAmountPaid(us.getAmountPaid());
        r.setPaymentMethod(us.getPaymentMethod());
        r.setTransactionId(us.getTransactionId());
        r.setCreatedAt(us.getCreatedAt());
        return r;
    }
}