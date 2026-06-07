package com.esprit.projectservice.dto;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ProjectRequest {
    private String title;
    private String description;
    private Double budget;
    private String startDate;
    private String endDate;
    private String status;
    private String category;
    private Integer clientId;
    private String clientName;
    private String clientLastName;
    private String clientEmail;
    private List<TaskDto> tasks;
}
