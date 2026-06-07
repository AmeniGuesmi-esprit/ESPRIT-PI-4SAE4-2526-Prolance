package com.esprit.microservice.pidev.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
@Schema(description = "Request body for registering a new user")
public class RegisterRequest {

    @Schema(description = "First name", example = "Farah")
    private String name;

    @Schema(description = "Last name", example = "Amami")
    private String lastName;

    @Schema(description = "Email", example = "farah@example.com")
    private String email;

    @Schema(description = "Password", example = "1234")
    private String password;

    @Schema(description = "Role", example = "ADMIN")
    private String role;

    @Schema(description = "Birth date", example = "2000-01-01")
    private LocalDate birthDate;
}


