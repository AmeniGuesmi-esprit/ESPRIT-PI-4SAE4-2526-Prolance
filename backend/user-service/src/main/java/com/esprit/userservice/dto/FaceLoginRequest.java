package com.esprit.userservice.dto;

public class FaceLoginRequest {

    private String email;
    private double faceMatchScore;
    private double livenessScore;
    private String role;
    private String deviceId;

    public FaceLoginRequest() {}

    public String getEmail()          { return email; }
    public double getFaceMatchScore() { return faceMatchScore; }
    public double getLivenessScore()  { return livenessScore; }
    public String getRole()           { return role; }
    public String getDeviceId()       { return deviceId; }

    public void setEmail(String email)                   { this.email = email; }
    public void setFaceMatchScore(double faceMatchScore) { this.faceMatchScore = faceMatchScore; }
    public void setLivenessScore(double livenessScore)   { this.livenessScore = livenessScore; }
    public void setRole(String role)                     { this.role = role; }
    public void setDeviceId(String deviceId)             { this.deviceId = deviceId; }
}
