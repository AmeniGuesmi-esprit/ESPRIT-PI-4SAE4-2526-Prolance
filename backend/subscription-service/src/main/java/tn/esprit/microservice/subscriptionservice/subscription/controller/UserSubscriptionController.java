package tn.esprit.microservice.subscriptionservice.subscription.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.microservice.subscriptionservice.subscription.dto.request.SubscribeRequest;
import tn.esprit.microservice.subscriptionservice.subscription.dto.response.UserSubscriptionResponse;
import tn.esprit.microservice.subscriptionservice.subscription.service.UserSubscriptionService;

import java.util.List;

@RestController
@RequestMapping("/api/user-subscriptions")
@RequiredArgsConstructor
public class UserSubscriptionController {
    private final UserSubscriptionService userSubscriptionService;

    @PostMapping("/subscribe")
    public ResponseEntity<UserSubscriptionResponse> subscribe(@Valid @RequestBody SubscribeRequest req) {
        return new ResponseEntity<>(userSubscriptionService.subscribe(req), HttpStatus.CREATED);
    }

    @GetMapping("/user/{userId}/active")
    public ResponseEntity<UserSubscriptionResponse> getActive(@PathVariable Long userId) {
        return ResponseEntity.ok(userSubscriptionService.getActiveSubscription(userId));
    }

    @GetMapping("/user/{userId}/history")
    public ResponseEntity<List<UserSubscriptionResponse>> getHistory(@PathVariable Long userId) {
        return ResponseEntity.ok(userSubscriptionService.getUserSubscriptionHistory(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserSubscriptionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(userSubscriptionService.getUserSubscriptionById(id));
    }

    @PatchMapping("/user/{userId}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Long userId) {
        userSubscriptionService.cancelSubscription(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/user/{userId}/renew")
    public ResponseEntity<UserSubscriptionResponse> renew(@PathVariable Long userId) {
        return ResponseEntity.ok(userSubscriptionService.renewSubscription(userId));
    }

    @PatchMapping("/user/{userId}/auto-renew")
    public ResponseEntity<Void> toggleAutoRenew(@PathVariable Long userId,
                                                @RequestParam Boolean autoRenew) {
        userSubscriptionService.toggleAutoRenew(userId, autoRenew);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/user/{userId}/increment-projects")
    public ResponseEntity<Void> incrementProjects(@PathVariable Long userId) {
        userSubscriptionService.incrementProjectCount(userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/user/{userId}/increment-proposals")
    public ResponseEntity<Void> incrementProposals(@PathVariable Long userId) {
        userSubscriptionService.incrementProposalCount(userId);
        return ResponseEntity.noContent().build();
    }
}