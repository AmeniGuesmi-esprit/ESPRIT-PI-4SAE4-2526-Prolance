package com.esprit.microservice.adsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AiSuggestionResponse {
    private String title;
    private String description;
}
