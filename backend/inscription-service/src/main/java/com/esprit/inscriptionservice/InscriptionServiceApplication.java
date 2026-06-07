package com.esprit.inscriptionservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class InscriptionServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(InscriptionServiceApplication.class, args);
    }
}
