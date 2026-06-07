package tn.esprit.microservice.subscriptionservice.subscription.client;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UserDTO {
    private Integer id;
    private String name;
    private String lastName;
    private String email;
    private String role;
    private LocalDate birthDate;
    private boolean enabled;
}