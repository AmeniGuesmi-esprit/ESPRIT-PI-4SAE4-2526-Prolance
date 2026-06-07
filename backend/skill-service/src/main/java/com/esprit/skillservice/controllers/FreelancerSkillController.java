package com.esprit.skillservice.controllers;

import com.esprit.skillservice.dto.SkillRequestDto;
import com.esprit.skillservice.entities.FreelancerSkill;
import com.esprit.skillservice.services.FreelancerSkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

@RestController @RequestMapping("/api/skills")
@RequiredArgsConstructor
public class FreelancerSkillController {

    private final FreelancerSkillService skillService;

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    @GetMapping("/freelancer/{freelancerId}")
    public ResponseEntity<List<FreelancerSkill>> getByFreelancer(@PathVariable Long freelancerId) {
        return ResponseEntity.ok(skillService.getByFreelancer(freelancerId));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<FreelancerSkill>> getByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(skillService.getByProject(projectId));
    }

    @PostMapping("/freelancer/{freelancerId}")
    public ResponseEntity<FreelancerSkill> create(@PathVariable Long freelancerId,
                                                  @RequestBody SkillRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillService.createForFreelancer(freelancerId, dto));
    }

    @DeleteMapping("/{skillId}")
    public ResponseEntity<Void> delete(@PathVariable Long skillId) {
        skillService.delete(skillId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/resume/upload/{freelancerId}")
    public ResponseEntity<String> uploadResume(@PathVariable Long freelancerId,
                                               @RequestParam("file") MultipartFile file) throws IOException {
        String resumeDir = uploadDir + "/resumes/";
        Files.createDirectories(Paths.get(resumeDir));
        String filename = "resume_" + freelancerId + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Files.write(Paths.get(resumeDir + filename), file.getBytes());
        return ResponseEntity.ok("/uploads/resumes/" + filename);
    }

    @GetMapping("/resume/generate/{freelancerId}")
    public ResponseEntity<byte[]> generateResume(@PathVariable Long freelancerId) {
        List<FreelancerSkill> skills = skillService.getByFreelancer(freelancerId);
        if (skills.isEmpty()) return ResponseEntity.notFound().build();
        byte[] pdf = skillService.generateResumePdf(freelancerId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=resume.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}