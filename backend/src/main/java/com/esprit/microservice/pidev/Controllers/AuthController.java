package com.esprit.microservice.pidev.Controllers;

import com.esprit.microservice.pidev.Entities.Role;
import com.esprit.microservice.pidev.Entities.User;
import com.esprit.microservice.pidev.dto.AuthRequest;
import com.esprit.microservice.pidev.dto.AuthResponse;
import com.esprit.microservice.pidev.dto.RegisterRequest;
import com.esprit.microservice.pidev.Services.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication API", description = "Register and login users")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }
    @Operation(summary = "Login a user")
    @PostMapping("/login")
    public AuthResponse login(@RequestBody AuthRequest request) {
        return authService.login(request);
    }

    @Operation(summary = "Register a new user")
    @PostMapping("/register")
    public void register(@RequestBody RegisterRequest request) {
        authService.register(request);
    }


}
