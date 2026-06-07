package com.esprit.applicationservice.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class ProjectDto {
    private Long id;
    private String title;
    private String description;
    private String status;
    private String category;
}
