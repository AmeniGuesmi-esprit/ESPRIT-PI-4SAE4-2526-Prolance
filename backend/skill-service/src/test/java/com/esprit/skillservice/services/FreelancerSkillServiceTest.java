package com.esprit.skillservice.services;

import com.esprit.skillservice.dto.SkillRequestDto;
import com.esprit.skillservice.entities.FreelancerSkill;
import com.esprit.skillservice.repositories.FreelancerSkillRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FreelancerSkillService - Tests Unitaires")
class FreelancerSkillServiceTest {

    @Mock
    private FreelancerSkillRepository skillRepo;

    @InjectMocks
    private FreelancerSkillService freelancerSkillService;

    private FreelancerSkill javaSkill;
    private FreelancerSkill reactSkill;

    @BeforeEach
    void setUp() {
        javaSkill = FreelancerSkill.builder()
                .id(1L).skillName("Java").level("EXPERT").yearsExperience(5).freelancerId(10L).build();

        reactSkill = FreelancerSkill.builder()
                .id(2L).skillName("React").level("INTERMEDIATE").yearsExperience(2).freelancerId(10L).build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getByFreelancer()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getByFreelancer()")
    class GetByFreelancerTests {

        @Test
        @DisplayName("Retourne toutes les compétences d'un freelancer")
        void getByFreelancer_returnsList() {
            when(skillRepo.findByFreelancerId(10L)).thenReturn(List.of(javaSkill, reactSkill));

            List<FreelancerSkill> results = freelancerSkillService.getByFreelancer(10L);

            assertThat(results).hasSize(2);
            assertThat(results).extracting(FreelancerSkill::getSkillName)
                    .containsExactlyInAnyOrder("Java", "React");
        }

        @Test
        @DisplayName("Retourne une liste vide si le freelancer n'a aucune compétence")
        void getByFreelancer_returnsEmpty() {
            when(skillRepo.findByFreelancerId(99L)).thenReturn(List.of());
            assertThat(freelancerSkillService.getByFreelancer(99L)).isEmpty();
        }

        @Test
        @DisplayName("Retourne uniquement les compétences du bon freelancer")
        void getByFreelancer_returnsCorrectFreelancer() {
            when(skillRepo.findByFreelancerId(10L)).thenReturn(List.of(javaSkill));

            List<FreelancerSkill> results = freelancerSkillService.getByFreelancer(10L);

            assertThat(results).isNotEmpty().allMatch(s -> s.getFreelancerId().equals(10L));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getByProject()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("getByProject()")
    class GetByProjectTests {

        @Test
        @DisplayName("Retourne les compétences associées à un projet")
        void getByProject_returnsList() {
            FreelancerSkill projectSkill = FreelancerSkill.builder()
                    .id(3L).skillName("Python").level("EXPERT").yearsExperience(4)
                    .freelancerId(5L).projectId(100L).build();

            when(skillRepo.findByProjectId(100L)).thenReturn(List.of(projectSkill));

            List<FreelancerSkill> results = freelancerSkillService.getByProject(100L);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).getProjectId()).isEqualTo(100L);
        }

        @Test
        @DisplayName("Retourne vide si aucune compétence pour ce projet")
        void getByProject_returnsEmpty() {
            when(skillRepo.findByProjectId(999L)).thenReturn(List.of());
            assertThat(freelancerSkillService.getByProject(999L)).isEmpty();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // createForFreelancer()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("createForFreelancer()")
    class CreateForFreelancerTests {

        @Test
        @DisplayName("Crée une nouvelle compétence pour un freelancer")
        void createForFreelancer_success() {
            SkillRequestDto dto = new SkillRequestDto("Spring Boot", "EXPERT", 3, null);

            FreelancerSkill saved = FreelancerSkill.builder()
                    .id(5L).skillName("Spring Boot").level("EXPERT").yearsExperience(3).freelancerId(10L).build();
            when(skillRepo.save(any(FreelancerSkill.class))).thenReturn(saved);

            FreelancerSkill result = freelancerSkillService.createForFreelancer(10L, dto);

            assertThat(result.getId()).isEqualTo(5L);
            assertThat(result.getSkillName()).isEqualTo("Spring Boot");
            assertThat(result.getLevel()).isEqualTo("EXPERT");
            assertThat(result.getYearsExperience()).isEqualTo(3);
            assertThat(result.getFreelancerId()).isEqualTo(10L);
            verify(skillRepo).save(any(FreelancerSkill.class));
        }

        @Test
        @DisplayName("Sauvegarde avec le bon freelancerId")
        void createForFreelancer_usesCorrectFreelancerId() {
            SkillRequestDto dto = new SkillRequestDto("Docker", "INTERMEDIATE", 2, null);

            when(skillRepo.save(any(FreelancerSkill.class))).thenAnswer(inv -> {
                FreelancerSkill skill = inv.getArgument(0);
                assertThat(skill.getFreelancerId()).isEqualTo(42L);
                assertThat(skill.getSkillName()).isEqualTo("Docker");
                return skill;
            });

            freelancerSkillService.createForFreelancer(42L, dto);
        }

        @Test
        @DisplayName("Crée une compétence avec niveau BEGINNER")
        void createForFreelancer_beginnerLevel() {
            SkillRequestDto dto = new SkillRequestDto("Kubernetes", "BEGINNER", 0, null);
            FreelancerSkill saved = FreelancerSkill.builder()
                    .id(6L).skillName("Kubernetes").level("BEGINNER").yearsExperience(0).freelancerId(7L).build();

            when(skillRepo.save(any())).thenReturn(saved);

            FreelancerSkill result = freelancerSkillService.createForFreelancer(7L, dto);

            assertThat(result.getLevel()).isEqualTo("BEGINNER");
            assertThat(result.getYearsExperience()).isZero();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // delete()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("delete()")
    class DeleteTests {

        @Test
        @DisplayName("Supprime une compétence par son ID")
        void delete_success() {
            doNothing().when(skillRepo).deleteById(1L);

            assertThatCode(() -> freelancerSkillService.delete(1L)).doesNotThrowAnyException();
            verify(skillRepo).deleteById(1L);
        }

        @Test
        @DisplayName("Appelle deleteById avec le bon ID")
        void delete_callsRepositoryWithCorrectId() {
            doNothing().when(skillRepo).deleteById(99L);

            freelancerSkillService.delete(99L);

            verify(skillRepo, times(1)).deleteById(99L);
            verify(skillRepo, never()).deleteById(1L);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // generateResumePdf()
    // ─────────────────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("generateResumePdf()")
    class GenerateResumePdfTests {

        @Test
        @DisplayName("Génère un PDF non vide pour un freelancer avec des compétences")
        void generateResumePdf_returnsBytes() {
            when(skillRepo.findByFreelancerId(10L)).thenReturn(List.of(javaSkill, reactSkill));

            byte[] pdf = freelancerSkillService.generateResumePdf(10L);

            assertThat(pdf).isNotNull().hasSizeGreaterThan(0);
            // Vérifie la signature PDF (%PDF-)
            assertThat(new String(pdf, 0, 5)).isEqualTo("%PDF-");
        }

        @Test
        @DisplayName("Génère un PDF pour un freelancer sans compétences (liste vide)")
        void generateResumePdf_emptySkills() {
            when(skillRepo.findByFreelancerId(99L)).thenReturn(List.of());

            byte[] pdf = freelancerSkillService.generateResumePdf(99L);

            assertThat(pdf).isNotNull().hasSizeGreaterThan(0);
        }

        @Test
        @DisplayName("Génère un PDF avec une seule compétence")
        void generateResumePdf_singleSkill() {
            when(skillRepo.findByFreelancerId(5L)).thenReturn(List.of(javaSkill));

            byte[] pdf = freelancerSkillService.generateResumePdf(5L);

            assertThat(pdf).isNotNull().hasSizeGreaterThan(0);
        }

        @Test
        @DisplayName("Génère un PDF correct avec compétences EXPERT, INTERMEDIATE, BEGINNER")
        void generateResumePdf_mixedLevels() {
            FreelancerSkill beginnerSkill = FreelancerSkill.builder()
                    .id(3L).skillName("AWS").level("BEGINNER").yearsExperience(1).freelancerId(10L).build();

            when(skillRepo.findByFreelancerId(10L)).thenReturn(List.of(javaSkill, reactSkill, beginnerSkill));

            byte[] pdf = freelancerSkillService.generateResumePdf(10L);

            assertThat(pdf).isNotNull().hasSizeGreaterThan(0);
        }
    }
}
