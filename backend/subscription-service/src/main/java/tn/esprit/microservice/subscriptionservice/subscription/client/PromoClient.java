package tn.esprit.microservice.subscriptionservice.subscription.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

import java.util.Map;

@FeignClient(name = "promo-service")
public interface PromoClient {

    @GetMapping("/promo/api/payments/promo/validate/{code}")
    Map<String, Object> validatePromoCode(@PathVariable("code") String code);

    @PostMapping("/promo/api/payments/promo/apply/{code}")
    Map<String, Object> applyPromoCode(@PathVariable("code") String code);
}