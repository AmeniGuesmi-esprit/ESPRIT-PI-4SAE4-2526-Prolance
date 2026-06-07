package com.esprit.microservice.adsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ModerationResponse {
    private boolean isSafe;
    private String categoryCode;
}
