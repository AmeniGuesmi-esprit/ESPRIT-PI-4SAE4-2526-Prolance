package com.esprit.skillservice.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class SkillRequestDto {
    private String skillName;
    private String level;
    private int yearsExperience;
    private String resumeUrl;
}
