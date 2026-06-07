package com.esprit.userservice.dto;

public class AuthResponse {
    private Integer id;
    private String token;
    private String role;
    private String name;
    private String lastName;
    private String imageUrl;

    public AuthResponse(Integer id, String token, String role, String name, String lastName, String imageUrl) {
        this.id = id;
        this.token = token;
        this.role = role;
        this.name = name;
        this.lastName = lastName;
        this.imageUrl = imageUrl;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}