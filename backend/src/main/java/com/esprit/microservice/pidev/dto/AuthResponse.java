package com.esprit.microservice.pidev.dto;
import com.esprit.microservice.pidev.Entities.Role;

public class AuthResponse {
    private String token;
    private Role role;
    private Integer id;

    public AuthResponse(String token, Role role, Integer id) {
        this.token = token;
        this.role = role;
        this.id = id;
    }

    // getters and setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
}
