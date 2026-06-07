package com.esprit.inscriptionservice.exceptions;

public class BadgeGenerationException extends RuntimeException {
    public BadgeGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
