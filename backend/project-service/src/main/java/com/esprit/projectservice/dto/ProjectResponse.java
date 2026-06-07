package com.esprit.projectservice.dto;

import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ProjectResponse {
    private Long id;
    private String title;
    private String description;
    private Double budget;
    private String startDate;
    private String endDate;
    private String createdAt;
    private String status;
    private String category;
    private ClientInfo client;
    private List<TaskInfo> tasks;
    private List<SkillInfo> requiredSkills;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ClientInfo {
        private Integer id;
        private String name;
        private String lastName;
        private String email;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TaskInfo {
        private Long id;
        private String taskName;
        private String description;
        private String startDate;
        private String endDate;
        private String priority;
        private String milestone;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SkillInfo {
        private Long id;
        private String skillName;
        private String level;
        private Integer yearsExperience;
    }
}
