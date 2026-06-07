package com.esprit.projectservice.controllers;

import com.esprit.projectservice.dto.ProjectRequest;
import com.esprit.projectservice.dto.ProjectResponse;
import com.esprit.projectservice.entities.ProjectStatus;
import com.esprit.projectservice.services.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/projects")
@RequiredArgsConstructor @Slf4j
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getAll() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @GetMapping("/my-projects/{clientId}")
    public ResponseEntity<List<ProjectResponse>> getMyProjects(@PathVariable Integer clientId) {
        return ResponseEntity.ok(projectService.getProjectsByClient(clientId));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<ProjectResponse>> getByStatus(@PathVariable String status) {
        try {
            ProjectStatus ps = ProjectStatus.valueOf(status.toUpperCase().replace("-", "_"));
            return ResponseEntity.ok(projectService.getProjectsByStatus(ps));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<ProjectResponse>> search(@RequestParam("q") String query) {
        return ResponseEntity.ok(projectService.searchProjects(query));
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> create(@RequestBody ProjectRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.createProject(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> update(@PathVariable Long id, @RequestBody ProjectRequest req) {
        return ResponseEntity.ok(projectService.updateProject(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteProject(@PathVariable Long id) {
        try {
            projectService.deleteProject(id);
            return ResponseEntity.noContent().build();  // 204 — succès
        } catch (IllegalStateException e) {
            // ✅ 409 CONFLICT — Angular intercepte ce statut et affiche showBlockedAlert
            log.warn("🚫 Delete bloqué pour projet {} : {}", id, e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
