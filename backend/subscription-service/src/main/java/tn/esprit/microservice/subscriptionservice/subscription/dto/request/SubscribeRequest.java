package tn.esprit.microservice.subscriptionservice.subscription.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SubscribeRequest {
    @NotNull
    private Long userId;

    @NotNull
    private Long subscriptionId;

    private Boolean autoRenew = true;
    private BigDecimal amountPaid;
    private String paymentMethod;
    private String transactionId;
}