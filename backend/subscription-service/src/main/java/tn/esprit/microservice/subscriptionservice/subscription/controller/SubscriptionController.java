package tn.esprit.microservice.subscriptionservice.subscription.controller;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.microservice.subscriptionservice.subscription.domain.enums.SubscriptionType;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.CreateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.UpdateSubscriptionRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.SubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.service.SubscriptionService;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {
    private final SubscriptionService subscriptionService;

    @PostMapping
    public ResponseEntity<SubscriptionResponse> create(@Valid @RequestBody CreateSubscriptionRequest req) {
        return new ResponseEntity<>(subscriptionService.createSubscription(req), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<SubscriptionResponse>> getAll() {
        return ResponseEntity.ok(subscriptionService.getAllSubscriptions());
    }

    @GetMapping("/active")
    public ResponseEntity<List<SubscriptionResponse>> getActive() {
        return ResponseEntity.ok(subscriptionService.getActiveSubscriptions());
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<SubscriptionResponse>> getByType(@PathVariable SubscriptionType type) {
        return ResponseEntity.ok(subscriptionService.getSubscriptionsByType(type));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SubscriptionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(subscriptionService.getSubscriptionById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SubscriptionResponse> update(@PathVariable Long id,
                                                       @Valid @RequestBody UpdateSubscriptionRequest req) {
        return ResponseEntity.ok(subscriptionService.updateSubscription(id, req));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        subscriptionService.deactivateSubscription(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<Void> activate(@PathVariable Long id) {
        subscriptionService.activateSubscription(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        subscriptionService.deleteSubscription(id);
        return ResponseEntity.noContent().build();
    }
}