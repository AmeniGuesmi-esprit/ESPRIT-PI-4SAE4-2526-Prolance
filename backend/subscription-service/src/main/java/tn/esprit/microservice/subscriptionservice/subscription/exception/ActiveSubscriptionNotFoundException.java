package tn.esprit.microservice.subscriptionservice.subscription.exception;


public class ActiveSubscriptionNotFoundException extends RuntimeException {
    public ActiveSubscriptionNotFoundException(Long userId) {
        super("Aucun abonnement actif pour l'utilisateur: " + userId);
    }
}