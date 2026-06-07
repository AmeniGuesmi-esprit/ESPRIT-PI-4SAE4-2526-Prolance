package com.esprit.projectservice.services;

import com.esprit.projectservice.dto.ProjectRequest;
import com.esprit.projectservice.dto.ProjectResponse;
import com.esprit.projectservice.dto.TaskDto;
import com.esprit.projectservice.entities.*;
import com.esprit.projectservice.repositories.ProjectRepository;
import com.esprit.projectservice.repositories.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProjectService - Tests Unitaires")
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private ProjectService projectService;

    private Project sampleProject;

    @BeforeEach
    void setUp() {
        sampleProject = Project.builder()
                .id(1L)
                .title("Refonte site e-commerce")
                .description("Projet de refonte complet")
                .budget(5000.0)
                .startDate(LocalDate.of(2025, 1, 1))
                .endDate(LocalDate.of(2025, 6, 30))
                .status(ProjectStatus.IN_PROGRESS)
                .category(Category.DEV)
                .clientId(42)
                .clientName("Alice")
                .clientLastName("Dupont")
                .clientEmail("alice@example.com")
                .tasks(new ArrayList<>())
                .requiredSkills(new ArrayList<>())
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getAllProjects()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getAllProjects()")
    class GetAllProjectsTests {

        @Test
        @DisplayName("Retourne tous les projets")
        void getAllProjects_returnsList() {
            when(projectRepository.findAll()).thenReturn(List.of(sampleProject));

            List<ProjectResponse> results = projectService.getAllProjects();

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getTitle()).isEqualTo("Refonte site e-commerce");
        }

        @Test
        @DisplayName("Retourne une liste vide si aucun projet")
        void getAllProjects_returnsEmpty() {
            when(projectRepository.findAll()).thenReturn(List.of());
            assertThat(projectService.getAllProjects()).isEmpty();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getProjectsByClient()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getProjectsByClient()")
    class GetProjectsByClientTests {

        @Test
        @DisplayName("Retourne les projets d'un client donné")
        void getProjectsByClient_returnsList() {
            when(projectRepository.findByClientId(42)).thenReturn(List.of(sampleProject));

            List<ProjectResponse> results = projectService.getProjectsByClient(42);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getClient().getId()).isEqualTo(42);
        }

        @Test
        @DisplayName("Retourne vide si le client n'a aucun projet")
        void getProjectsByClient_returnsEmpty() {
            when(projectRepository.findByClientId(999)).thenReturn(List.of());
            assertThat(projectService.getProjectsByClient(999)).isEmpty();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getProjectById()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getProjectById()")
    class GetProjectByIdTests {

        @Test
        @DisplayName("Retourne le projet correspondant à l'ID")
        void getProjectById_found() {
            when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));

            ProjectResponse result = projectService.getProjectById(1L);

            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getTitle()).isEqualTo("Refonte site e-commerce");
        }

        @Test
        @DisplayName("Lève RuntimeException si projet introuvable")
        void getProjectById_notFound() {
            when(projectRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> projectService.getProjectById(999L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Project not found");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // createProject()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("createProject()")
    class CreateProjectTests {

        @Test
        @DisplayName("Crée un projet avec succès")
        void createProject_success() {
            ProjectRequest req = ProjectRequest.builder()
                    .title("Nouveau projet IA")
                    .description("Développement d'un modèle ML")
                    .budget(8000.0)
                    .startDate("2025-03-01")
                    .endDate("2025-12-31")
                    .status("IN_PROGRESS")
                    .category("DATA")
                    .clientId(10)
                    .clientName("Bob")
                    .clientLastName("Martin")
                    .clientEmail("bob@test.com")
                    .build();

            Project saved = Project.builder()
                    .id(2L).title("Nouveau projet IA").description("Développement d'un modèle ML")
                    .status(ProjectStatus.IN_PROGRESS).category(Category.DATA)
                    .clientId(10).clientName("Bob").clientLastName("Martin").clientEmail("bob@test.com")
                    .tasks(new ArrayList<>()).requiredSkills(new ArrayList<>()).build();

            when(projectRepository.save(any(Project.class))).thenReturn(saved);

            ProjectResponse result = projectService.createProject(req);

            assertThat(result.getId()).isEqualTo(2L);
            assertThat(result.getTitle()).isEqualTo("Nouveau projet IA");
            assertThat(result.getStatus()).isEqualTo("IN_PROGRESS");
            verify(projectRepository).save(any(Project.class));
        }

        @Test
        @DisplayName("Crée un projet avec des tâches")
        void createProject_withTasks() {
            TaskDto taskDto = new TaskDto();
            taskDto.setTaskName("Analyse des besoins");
            taskDto.setDescription("Réunion client");
            taskDto.setStartDate("2025-03-01");
            taskDto.setEndDate("2025-03-10");
            taskDto.setPriority("HIGH");

            ProjectRequest req = ProjectRequest.builder()
                    .title("Projet avec tâches")
                    .description("Description")
                    .status("IN_PROGRESS")
                    .category("DEV")
                    .clientId(1)
                    .tasks(List.of(taskDto))
                    .build();

            Task task = Task.builder().id(1L).taskName("Analyse des besoins").build();
            Project saved = Project.builder()
                    .id(3L).title("Projet avec tâches").description("Description")
                    .status(ProjectStatus.IN_PROGRESS).category(Category.DEV).clientId(1)
                    .tasks(List.of(task)).requiredSkills(new ArrayList<>()).build();

            when(projectRepository.save(any(Project.class))).thenReturn(saved);

            ProjectResponse result = projectService.createProject(req);

            assertThat(result.getTasks()).hasSize(1);
            assertThat(result.getTasks().get(0).getTaskName()).isEqualTo("Analyse des besoins");
        }

        @Test
        @DisplayName("Utilise IN_PROGRESS par défaut si statut inconnu")
        void createProject_defaultsToInProgress() {
            ProjectRequest req = ProjectRequest.builder()
                    .title("Test").description("Desc").status("INVALID_STATUS")
                    .category("DEV").clientId(1).build();

            when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
                Project p = inv.getArgument(0);
                assertThat(p.getStatus()).isEqualTo(ProjectStatus.IN_PROGRESS);
                p.setId(5L);
                p.setTasks(new ArrayList<>());
                p.setRequiredSkills(new ArrayList<>());
                return p;
            });

            assertThatCode(() -> projectService.createProject(req)).doesNotThrowAnyException();
        }

        // ── NOUVEAU : couvre parseCategory() catch + parsePriority() catch ──

        @Test
        @DisplayName("Utilise GENERAL si catégorie invalide (couvre parseCategory catch)")
        void createProject_invalidCategory_defaultsToGeneral() {
            ProjectRequest req = ProjectRequest.builder()
                    .title("Test").description("Desc").status("IN_PROGRESS")
                    .category("INVALID_CATEGORY").clientId(1).build();

            when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
                Project p = inv.getArgument(0);
                assertThat(p.getCategory()).isEqualTo(Category.GENERAL);
                p.setId(6L);
                p.setTasks(new ArrayList<>());
                p.setRequiredSkills(new ArrayList<>());
                return p;
            });

            assertThatCode(() -> projectService.createProject(req)).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Crée un projet avec une tâche de priorité invalide (couvre parsePriority catch)")
        void createProject_invalidTaskPriority_defaultsToMedium() {
            TaskDto taskDto = new TaskDto();
            taskDto.setTaskName("Tâche test");
            taskDto.setPriority("INVALID_PRIORITY");
            taskDto.setStartDate("not-a-date"); // couvre aussi parseDate catch

            ProjectRequest req = ProjectRequest.builder()
                    .title("Test").description("Desc").status("IN_PROGRESS")
                    .category("DEV").clientId(1).tasks(List.of(taskDto)).build();

            when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
                Project p = inv.getArgument(0);
                Task t = p.getTasks().get(0);
                assertThat(t.getPriority()).isEqualTo(Priority.MEDIUM);
                assertThat(t.getStartDate()).isNull(); // parseDate a retourné null
                p.setId(7L);
                p.setRequiredSkills(new ArrayList<>());
                return p;
            });

            assertThatCode(() -> projectService.createProject(req)).doesNotThrowAnyException();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // updateProject()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("updateProject()")
    class UpdateProjectTests {

        @Test
        @DisplayName("Met à jour un projet existant")
        void updateProject_success() {
            ProjectRequest req = ProjectRequest.builder()
                    .title("Titre modifié").description("Nouvelle description")
                    .budget(9999.0).startDate("2025-05-01").endDate("2025-12-01")
                    .status("COMPLETED").category("DESIGN")
                    .build();

            when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));
            when(projectRepository.save(any(Project.class))).thenReturn(sampleProject);

            ProjectResponse result = projectService.updateProject(1L, req);

            assertThat(result).isNotNull();
            verify(projectRepository).save(sampleProject);
        }

        @Test
        @DisplayName("Lève RuntimeException si projet introuvable pour mise à jour")
        void updateProject_notFound() {
            ProjectRequest req = ProjectRequest.builder()
                    .title("X").description("Y").status("IN_PROGRESS").category("DEV").build();

            when(projectRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> projectService.updateProject(999L, req))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Project not found");
        }


        @Test
        @DisplayName("Met à jour les infos client si non nulles (couvre les 3 branches if)")
        void updateProject_updatesClientInfoWhenNotNull() {
            ProjectRequest req = ProjectRequest.builder()
                    .title("Titre").description("Desc").status("IN_PROGRESS").category("DEV")
                    .clientName("Charlie")
                    .clientLastName("Brown")
                    .clientEmail("charlie@test.com")
                    .build();

            when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));
            when(projectRepository.save(any(Project.class))).thenAnswer(inv -> {
                Project p = inv.getArgument(0);
                assertThat(p.getClientName()).isEqualTo("Charlie");
                assertThat(p.getClientLastName()).isEqualTo("Brown");
                assertThat(p.getClientEmail()).isEqualTo("charlie@test.com");
                p.setTasks(new ArrayList<>());
                p.setRequiredSkills(new ArrayList<>());
                return p;
            });

            assertThatCode(() -> projectService.updateProject(1L, req)).doesNotThrowAnyException();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // deleteProject()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("deleteProject()")
    class DeleteProjectTests {

        @Test
        @DisplayName("Supprime un projet non OPEN")
        void deleteProject_success() {
            sampleProject.setStatus(ProjectStatus.COMPLETED);
            when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));

            assertThatCode(() -> projectService.deleteProject(1L)).doesNotThrowAnyException();
            verify(projectRepository).deleteById(1L);
        }

        @Test
        @DisplayName("Lève IllegalStateException pour un projet OPEN")
        void deleteProject_throwsForOpenProject() {
            sampleProject.setStatus(ProjectStatus.OPEN);
            when(projectRepository.findById(1L)).thenReturn(Optional.of(sampleProject));

            assertThatThrownBy(() -> projectService.deleteProject(1L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Cannot delete an OPEN project");

            verify(projectRepository, never()).deleteById(any());
        }

        @Test
        @DisplayName("Lève RuntimeException si projet introuvable")
        void deleteProject_notFound() {
            when(projectRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> projectService.deleteProject(999L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Project not found");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getProjectsByStatus()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getProjectsByStatus()")
    class GetProjectsByStatusTests {

        @Test
        @DisplayName("Filtre les projets par statut IN_PROGRESS")
        void getProjectsByStatus_inProgress() {
            when(projectRepository.findByStatus(ProjectStatus.IN_PROGRESS))
                    .thenReturn(List.of(sampleProject));

            List<ProjectResponse> results = projectService.getProjectsByStatus(ProjectStatus.IN_PROGRESS);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getStatus()).isEqualTo("IN_PROGRESS");
        }

        @Test
        @DisplayName("Retourne vide pour un statut sans projets")
        void getProjectsByStatus_empty() {
            when(projectRepository.findByStatus(ProjectStatus.CANCELLED)).thenReturn(List.of());
            assertThat(projectService.getProjectsByStatus(ProjectStatus.CANCELLED)).isEmpty();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // searchProjects()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("searchProjects()")
    class SearchProjectsTests {

        @Test
        @DisplayName("Retourne les projets contenant le mot-clé dans le titre")
        void searchProjects_foundByTitle() {
            when(projectRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
                    "e-commerce", "e-commerce"))
                    .thenReturn(List.of(sampleProject));

            List<ProjectResponse> results = projectService.searchProjects("e-commerce");

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getTitle()).contains("e-commerce");
        }

        @Test
        @DisplayName("Retourne vide si aucun projet ne correspond à la recherche")
        void searchProjects_notFound() {
            when(projectRepository.findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
                    "XYZ", "XYZ"))
                    .thenReturn(List.of());

            assertThat(projectService.searchProjects("XYZ")).isEmpty();
        }
    }
}