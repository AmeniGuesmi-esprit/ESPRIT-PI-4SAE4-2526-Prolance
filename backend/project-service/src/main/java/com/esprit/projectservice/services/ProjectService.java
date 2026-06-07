package com.esprit.projectservice.services;

import com.esprit.projectservice.dto.ProjectRequest;
import com.esprit.projectservice.dto.ProjectResponse;
import com.esprit.projectservice.dto.TaskDto;
import com.esprit.projectservice.entities.*;
import com.esprit.projectservice.repositories.ProjectRepository;
import com.esprit.projectservice.repositories.TaskRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j @Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private static final String PROJECT_NOT_FOUND = "Project not found: ";

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public List<ProjectResponse> getAllProjects() {
        return projectRepository.findAll().stream().map(this::toResponse).toList();
    }

    public List<ProjectResponse> getProjectsByClient(Integer clientId) {
        return projectRepository.findByClientId(clientId).stream().map(this::toResponse).toList();
    }

    public ProjectResponse getProjectById(Long id) {
        return toResponse(projectRepository.findById(id).orElseThrow(() ->new RuntimeException(PROJECT_NOT_FOUND + id)));
    }

    public ProjectResponse createProject(ProjectRequest req) {
        Project project = Project.builder()
                .title(req.getTitle()).description(req.getDescription()).budget(req.getBudget())
                .startDate(parseDate(req.getStartDate())).endDate(parseDate(req.getEndDate()))
                .status(parseStatus(req.getStatus(), ProjectStatus.IN_PROGRESS))
                .category(parseCategory(req.getCategory()))
                .clientId(req.getClientId()).clientName(req.getClientName())
                .clientLastName(req.getClientLastName()).clientEmail(req.getClientEmail())
                .tasks(new ArrayList<>()).requiredSkills(new ArrayList<>()).build();

        if (req.getTasks() != null) {
            req.getTasks().stream().map(dto -> buildTask(dto, project)).forEach(project.getTasks()::add);
        }
        Project saved = projectRepository.save(project);
        log.info("✅ Project created: id={}, title={}", saved.getId(), saved.getTitle());
        return toResponse(saved);
    }

    public ProjectResponse updateProject(Long id, ProjectRequest req) {
        Project project = projectRepository.findById(id).orElseThrow(() -> new RuntimeException(PROJECT_NOT_FOUND + id));
        project.setTitle(req.getTitle()); project.setDescription(req.getDescription());
        project.setBudget(req.getBudget()); project.setStartDate(parseDate(req.getStartDate()));
        project.setEndDate(parseDate(req.getEndDate()));
        project.setStatus(parseStatus(req.getStatus(), project.getStatus()));
        project.setCategory(parseCategory(req.getCategory()));
        if (req.getClientName() != null)     project.setClientName(req.getClientName());
        if (req.getClientLastName() != null) project.setClientLastName(req.getClientLastName());
        if (req.getClientEmail() != null)    project.setClientEmail(req.getClientEmail());
        project.getTasks().clear();
        if (req.getTasks() != null) {
            req.getTasks().stream().map(dto -> buildTask(dto, project)).forEach(project.getTasks()::add);
        }
        return toResponse(projectRepository.save(project));
    }

    public void deleteProject(Long id) {
        Project project = projectRepository.findById(id).orElseThrow(() -> new RuntimeException(PROJECT_NOT_FOUND + id));
        if (ProjectStatus.OPEN.equals(project.getStatus())) {
            throw new IllegalStateException("Cannot delete an OPEN project.");
        }
        projectRepository.deleteById(id);
    }

    public List<ProjectResponse> getProjectsByStatus(ProjectStatus status) {
        return projectRepository.findByStatus(status).stream().map(this::toResponse).toList();
    }

    public List<ProjectResponse> searchProjects(String query) {
        return projectRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(query, query)
                .stream().map(this::toResponse).toList();
    }

    private ProjectResponse toResponse(Project p) {
        return ProjectResponse.builder()
                .id(p.getId()).title(p.getTitle()).description(p.getDescription()).budget(p.getBudget())
                .startDate(p.getStartDate() != null ? p.getStartDate().toString() : null)
                .endDate(p.getEndDate() != null ? p.getEndDate().toString() : null)
                .createdAt(p.getCreatedAt() != null ? p.getCreatedAt().toString() : null)
                .status(p.getStatus() != null ? p.getStatus().name() : null)
                .category(p.getCategory() != null ? p.getCategory().name() : null)
                .client(ProjectResponse.ClientInfo.builder().id(p.getClientId()).name(p.getClientName())
                        .lastName(p.getClientLastName()).email(p.getClientEmail()).build())
                .tasks(p.getTasks().stream().map(t -> ProjectResponse.TaskInfo.builder()
                        .id(t.getId()).taskName(t.getTaskName()).description(t.getDescription())
                        .startDate(t.getStartDate() != null ? t.getStartDate().toString() : null)
                        .endDate(t.getEndDate() != null ? t.getEndDate().toString() : null)
                        .priority(t.getPriority() != null ? t.getPriority().name() : null)
                        .milestone(t.getMilestone()).build()).toList())
                .requiredSkills(p.getRequiredSkills().stream().map(s -> ProjectResponse.SkillInfo.builder()
                        .id(s.getId()).skillName(s.getSkillName()).level(s.getLevel())
                        .yearsExperience(s.getYearsExperience()).build()).toList())
                .build();
    }

    private Task buildTask(TaskDto dto, Project project) {
        return Task.builder().taskName(dto.getTaskName()).description(dto.getDescription())
                .startDate(parseDate(dto.getStartDate())).endDate(parseDate(dto.getEndDate()))
                .priority(parsePriority(dto.getPriority())).milestone(dto.getMilestone())
                .project(project).build();
    }

    private LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) return null;
        try { return LocalDate.parse(date, DATE_FMT); } catch (Exception e) { return null; }
    }

    private ProjectStatus parseStatus(String s, ProjectStatus def) {
        if (s == null) return def;
        try { return ProjectStatus.valueOf(s.toUpperCase()); } catch (Exception e) { return def; }
    }

    private Category parseCategory(String c) {
        if (c == null) return Category.GENERAL;
        try { return Category.valueOf(c.toUpperCase()); } catch (Exception e) { return Category.GENERAL; }
    }

    private Priority parsePriority(String p) {
        if (p == null) return Priority.MEDIUM;
        try { return Priority.valueOf(p.toUpperCase()); } catch (Exception e) { return Priority.MEDIUM; }
    }
}
