package com.esprit.inscriptionservice.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    @Test
    void securityConfigShouldBeInstantiable() {
        SecurityConfig config = new SecurityConfig();
        assertThat(config).isNotNull();
    }

    @Test
    void mockRequestShouldWork() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod("GET");
        assertThat(request.getMethod()).isEqualTo("GET");
    }
}