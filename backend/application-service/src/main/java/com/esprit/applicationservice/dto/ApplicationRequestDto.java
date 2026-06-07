package com.esprit.applicationservice.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class ApplicationRequestDto {
    private Long freelancerId;
    private Long projectId;
    private String coverLetterUrl;
}
