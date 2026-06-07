package com.esprit.projectservice.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TaskDto {
    private String taskName;
    private String description;
    private String startDate;
    private String endDate;
    private String priority;
    private String milestone;
}
