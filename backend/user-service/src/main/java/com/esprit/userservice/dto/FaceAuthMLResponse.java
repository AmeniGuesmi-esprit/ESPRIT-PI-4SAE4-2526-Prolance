package com.esprit.userservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class FaceAuthMLResponse {

    private boolean approved;
    private double  confidence;

    @JsonProperty("risk_level")
    private String  riskLevel;

    public FaceAuthMLResponse() {}

    public boolean isApproved()    { return approved; }
    public double  getConfidence() { return confidence; }
    public String  getRiskLevel()  { return riskLevel; }

    public void setApproved(boolean approved)    { this.approved = approved; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
    public void setRiskLevel(String riskLevel)   { this.riskLevel = riskLevel; }
}
