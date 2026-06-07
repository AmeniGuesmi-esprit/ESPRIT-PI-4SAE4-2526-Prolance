package com.esprit.microservice.adsservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GenerateSuggestionRequest {
    @NotBlank(message = "Prompt is required")
    private String prompt;
}
