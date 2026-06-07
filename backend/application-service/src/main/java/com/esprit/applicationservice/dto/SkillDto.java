package com.esprit.applicationservice.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class SkillDto {
    private Long id;
    private String skillName;
    private String level;
    private int yearsExperience;
}
