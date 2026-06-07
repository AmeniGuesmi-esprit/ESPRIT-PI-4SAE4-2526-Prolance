package com.esprit.eventservice.dto;

import java.time.LocalDate;

public class UserDTO {
    private Integer id;
    private String name;
    private String lastName;
    private String email;
    private LocalDate birthDate;
    private String role;


    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
