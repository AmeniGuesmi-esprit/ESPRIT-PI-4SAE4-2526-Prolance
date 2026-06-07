package com.esprit.inscriptionservice.exceptions;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class BadgeGenerationExceptionTest {

    @Test
    void testExceptionMessage() {
        Throwable cause = new RuntimeException("cause");
        BadgeGenerationException ex = new BadgeGenerationException("test message", cause);
        assertEquals("test message", ex.getMessage());
    }

    @Test
    void testExceptionCause() {
        Throwable cause = new RuntimeException("cause");
        BadgeGenerationException ex = new BadgeGenerationException("test message", cause);
        assertEquals(cause, ex.getCause());
    }

    @Test
    void testExceptionIsRuntimeException() {
        Throwable cause = new RuntimeException("cause");
        BadgeGenerationException ex = new BadgeGenerationException("test message", cause);
        assertInstanceOf(RuntimeException.class, ex);
    }
}