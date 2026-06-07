package com.esprit.applicationservice.services;

import com.esprit.applicationservice.dto.ApplicationRequestDto;
import com.esprit.applicationservice.dto.ProjectDto;
import com.esprit.applicationservice.dto.SkillDto;
import com.esprit.applicationservice.entities.Application;
import com.esprit.applicationservice.repositories.ApplicationRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApplicationService - Tests Unitaires")
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepo;

    @Mock
    private WebClient.Builder webClientBuilder;

    @Mock
    private WebClient webClient;

    @SuppressWarnings("rawtypes")
    @Mock
    private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @SuppressWarnings("rawtypes")
    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    @InjectMocks
    private ApplicationService applicationService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        // Utilise un répertoire temporaire pour éviter les erreurs de fichiers
        ReflectionTestUtils.setField(applicationService, "uploadDir", tempDir.toString());
        ReflectionTestUtils.setField(applicationService, "projectServiceUrl", "http://localhost:8222");
        ReflectionTestUtils.setField(applicationService, "skillServiceUrl", "http://localhost:8222");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // submit()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("submit()")
    class SubmitTests {

        @Test
        @DisplayName("Doit soumettre une candidature avec succès")
        void submit_success() {
            ApplicationRequestDto dto = new ApplicationRequestDto(1L, 10L, "/uploads/cv.pdf");

            when(applicationRepo.existsByFreelancerIdAndProjectId(1L, 10L)).thenReturn(false);
            when(applicationRepo.countByFreelancerId(1L)).thenReturn(0L);

            Application saved = Application.builder()
                    .id(1L).freelancerId(1L).projectId(10L).coverLetterUrl("/uploads/cv.pdf").build();
            when(applicationRepo.save(any(Application.class))).thenReturn(saved);

            Application result = applicationService.submit(dto);

            assertThat(result).isNotNull();
            assertThat(result.getFreelancerId()).isEqualTo(1L);
            assertThat(result.getProjectId()).isEqualTo(10L);
            assertThat(result.getCoverLetterUrl()).isEqualTo("/uploads/cv.pdf");
            verify(applicationRepo).save(any(Application.class));
        }

        @Test
        @DisplayName("Doit lever une exception si le freelancer a déjà postulé")
        void submit_throwsWhenAlreadyApplied() {
            ApplicationRequestDto dto = new ApplicationRequestDto(1L, 10L, null);

            when(applicationRepo.existsByFreelancerIdAndProjectId(1L, 10L)).thenReturn(true);

            assertThatThrownBy(() -> applicationService.submit(dto))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("déjà postulé");

            verify(applicationRepo, never()).save(any());
        }

        @Test
        @DisplayName("Doit lever une exception si le quota de 10 candidatures est atteint")
        void submit_throwsWhenQuotaReached() {
            ApplicationRequestDto dto = new ApplicationRequestDto(2L, 20L, null);

            when(applicationRepo.existsByFreelancerIdAndProjectId(2L, 20L)).thenReturn(false);
            when(applicationRepo.countByFreelancerId(2L)).thenReturn(10L);

            assertThatThrownBy(() -> applicationService.submit(dto))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Quota maximum");

            verify(applicationRepo, never()).save(any());
        }

        @Test
        @DisplayName("Doit accepter exactement 9 candidatures (quota non atteint)")
        void submit_allowsUpToQuotaMinus1() {
            ApplicationRequestDto dto = new ApplicationRequestDto(3L, 30L, null);

            when(applicationRepo.existsByFreelancerIdAndProjectId(3L, 30L)).thenReturn(false);
            when(applicationRepo.countByFreelancerId(3L)).thenReturn(9L);
            when(applicationRepo.save(any())).thenReturn(Application.builder().id(99L).build());

            assertThatCode(() -> applicationService.submit(dto)).doesNotThrowAnyException();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // alreadyApplied()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("alreadyApplied()")
    class AlreadyAppliedTests {

        @Test
        @DisplayName("Retourne true si une candidature existe")
        void alreadyApplied_returnsTrue() {
            when(applicationRepo.existsByFreelancerIdAndProjectId(1L, 5L)).thenReturn(true);
            assertThat(applicationService.alreadyApplied(1L, 5L)).isTrue();
        }

        @Test
        @DisplayName("Retourne false si aucune candidature n'existe")
        void alreadyApplied_returnsFalse() {
            when(applicationRepo.existsByFreelancerIdAndProjectId(1L, 5L)).thenReturn(false);
            assertThat(applicationService.alreadyApplied(1L, 5L)).isFalse();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getByFreelancer()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getByFreelancer()")
    class GetByFreelancerTests {

        @Test
        @DisplayName("Retourne la liste des candidatures d'un freelancer")
        void getByFreelancer_returnsList() {
            Application a1 = Application.builder().id(1L).freelancerId(7L).projectId(10L).build();
            Application a2 = Application.builder().id(2L).freelancerId(7L).projectId(20L).build();
            when(applicationRepo.findByFreelancerId(7L)).thenReturn(List.of(a1, a2));

            List<Application> results = applicationService.getByFreelancer(7L);

            assertThat(results).hasSize(2);
            assertThat(results).extracting(Application::getFreelancerId).containsOnly(7L);
        }

        @Test
        @DisplayName("Retourne une liste vide si aucune candidature")
        void getByFreelancer_returnsEmptyList() {
            when(applicationRepo.findByFreelancerId(99L)).thenReturn(List.of());
            assertThat(applicationService.getByFreelancer(99L)).isEmpty();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getByProject()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getByProject()")
    class GetByProjectTests {

        @Test
        @DisplayName("Retourne les candidatures pour un projet donné")
        void getByProject_returnsList() {
            Application a1 = Application.builder().id(1L).freelancerId(1L).projectId(5L).build();
            when(applicationRepo.findByProjectId(5L)).thenReturn(List.of(a1));

            List<Application> results = applicationService.getByProject(5L);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getProjectId()).isEqualTo(5L);
        }

        @Test
        @DisplayName("Retourne une liste vide si aucune candidature pour le projet")
        void getByProject_returnsEmptyList() {
            when(applicationRepo.findByProjectId(999L)).thenReturn(List.of());
            assertThat(applicationService.getByProject(999L)).isEmpty();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // acceptApplication()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("acceptApplication()")
    class AcceptApplicationTests {

        @Test
        @DisplayName("Doit accepter une candidature existante")
        void acceptApplication_success() {
            Application app = Application.builder().id(1L).accepted(false).build();
            when(applicationRepo.findById(1L)).thenReturn(Optional.of(app));
            when(applicationRepo.save(app)).thenReturn(app);

            Application result = applicationService.acceptApplication(1L);

            assertThat(result.isAccepted()).isTrue();
            verify(applicationRepo).save(app);
        }

        @Test
        @DisplayName("Doit lever RuntimeException si la candidature n'existe pas")
        void acceptApplication_throwsWhenNotFound() {
            when(applicationRepo.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> applicationService.acceptApplication(999L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Application not found");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // countByFreelancer()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("countByFreelancer()")
    class CountByFreelancerTests {

        @Test
        @DisplayName("Retourne le nombre de candidatures d'un freelancer")
        void countByFreelancer_returnsCount() {
            when(applicationRepo.countByFreelancerId(3L)).thenReturn(5L);
            assertThat(applicationService.countByFreelancer(3L)).isEqualTo(5L);
        }

        @Test
        @DisplayName("Retourne 0 si aucune candidature")
        void countByFreelancer_returnsZero() {
            when(applicationRepo.countByFreelancerId(99L)).thenReturn(0L);
            assertThat(applicationService.countByFreelancer(99L)).isZero();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // uploadCoverLetter()   ← MANQUAIT COMPLÈTEMENT
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("uploadCoverLetter()")
    class UploadCoverLetterTests {

        @Test
        @DisplayName("Doit uploader un fichier et retourner l'URL correcte")
        void uploadCoverLetter_success() throws IOException {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "test.pdf", "application/pdf", "PDF content".getBytes()
            );

            String url = applicationService.uploadCoverLetter(1L, file);

            // Chained assertions (fix java:S5853)
            assertThat(url)
                    .startsWith("/uploads/cover-letters/")
                    .contains("cover_1_")
                    .endsWith(".pdf");
        }

        @Test
        @DisplayName("Doit créer le répertoire s'il n'existe pas")
        void uploadCoverLetter_createsDirectory() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "letter.pdf", "application/pdf", "data".getBytes()
            );

            // Le tempDir est propre — le sous-répertoire n'existe pas encore
            assertThatCode(() -> applicationService.uploadCoverLetter(42L, file))
                    .doesNotThrowAnyException();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // generateCoverLetter()   ← MANQUAIT COMPLÈTEMENT
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("generateCoverLetter()")
    class GenerateCoverLetterTests {

        @SuppressWarnings("unchecked")
        private void mockWebClient(ProjectDto project, List<SkillDto> skills) {
            when(webClientBuilder.build()).thenReturn(webClient);
            when(webClient.get()).thenReturn(requestHeadersUriSpec);
            when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);

            // Premier appel → projet, deuxième → skills
            when(responseSpec.bodyToMono(ProjectDto.class)).thenReturn(Mono.just(project));
            when(responseSpec.bodyToFlux(SkillDto.class)).thenReturn(Flux.fromIterable(skills));
        }

        @Test
        @DisplayName("Doit générer un PDF et retourner l'URL correcte")
        void generateCoverLetter_success() throws IOException {
            ProjectDto project = new ProjectDto();
            project.setTitle("Projet Test");
            project.setDescription("Une description du projet.");

            SkillDto skill = new SkillDto();
            skill.setSkillName("Java");
            skill.setLevel("Expert");
            skill.setYearsExperience(5);

            mockWebClient(project, List.of(skill));

            String url = applicationService.generateCoverLetter(1L, 10L);

            // Chained assertions (fix java:S5853)
            assertThat(url)
                    .startsWith("/uploads/cover-letters/")
                    .contains("cover_generated_1_")
                    .endsWith(".pdf");
        }

        @Test
        @DisplayName("Doit générer un PDF même sans compétences")
        void generateCoverLetter_withNoSkills() throws IOException {
            ProjectDto project = new ProjectDto();
            project.setTitle("Projet Sans Skills");
            project.setDescription(null);

            mockWebClient(project, List.of());

            String url = applicationService.generateCoverLetter(2L, 20L);

            // Chained assertions (fix java:S5853)
            assertThat(url)
                    .startsWith("/uploads/cover-letters/")
                    .contains("cover_generated_2_");
        }

        @Test
        @DisplayName("Doit lever une exception si le projet n'est pas trouvé")
        void generateCoverLetter_throwsWhenProjectNotFound() {
            when(webClientBuilder.build()).thenReturn(webClient);
            when(webClient.get()).thenReturn(requestHeadersUriSpec);
            when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
            when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.bodyToMono(ProjectDto.class)).thenReturn(Mono.empty());

            assertThatThrownBy(() -> applicationService.generateCoverLetter(1L, 999L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Project not found");
        }
    }
}