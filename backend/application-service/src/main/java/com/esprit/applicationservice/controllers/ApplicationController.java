package com.esprit.applicationservice.controllers;

import com.esprit.applicationservice.dto.ApplicationRequestDto;
import com.esprit.applicationservice.entities.Application;
import com.esprit.applicationservice.services.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping
    public ResponseEntity<Object> submit(@RequestBody ApplicationRequestDto dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.submit(dto));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/check")
    public ResponseEntity<Boolean> check(@RequestParam Long freelancerId, @RequestParam Long projectId) {
        return ResponseEntity.ok(applicationService.alreadyApplied(freelancerId, projectId));
    }

    @GetMapping("/freelancer/{freelancerId}")
    public ResponseEntity<List<Application>> getByFreelancer(@PathVariable Long freelancerId) {
        return ResponseEntity.ok(applicationService.getByFreelancer(freelancerId));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Application>> getByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(applicationService.getByProject(projectId));
    }
    @PatchMapping("/{id}/accept")
    public ResponseEntity<Application> accept(@PathVariable Long id) {
        return ResponseEntity.ok(applicationService.acceptApplication(id));
    }

    @PostMapping(value = "/cover-letter/upload/{freelancerId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> uploadCoverLetter(@PathVariable Long freelancerId,
                                                    @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(applicationService.uploadCoverLetter(freelancerId, file));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    @PostMapping("/generate-cover-letter")
    public ResponseEntity<String> generateCoverLetter(@RequestBody Map<String, Long> body) {
        try {
            return ResponseEntity.ok(applicationService.generateCoverLetter(
                    body.get("freelancerId"), body.get("projectId")));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Generation failed: " + e.getMessage());
        }
    }

    @GetMapping("/count/{freelancerId}")
    public ResponseEntity<Long> count(@PathVariable Long freelancerId) {
        return ResponseEntity.ok(applicationService.countByFreelancer(freelancerId));
    }
}
