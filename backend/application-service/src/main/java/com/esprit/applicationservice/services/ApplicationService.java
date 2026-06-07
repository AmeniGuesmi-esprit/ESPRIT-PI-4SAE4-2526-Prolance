package com.esprit.applicationservice.services;

import com.esprit.applicationservice.dto.ApplicationRequestDto;
import com.esprit.applicationservice.dto.ProjectDto;
import com.esprit.applicationservice.dto.SkillDto;
import com.esprit.applicationservice.entities.Application;
import com.esprit.applicationservice.repositories.ApplicationRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;

import java.awt.Color;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional
public class ApplicationService {

    private final ApplicationRepository applicationRepo;
    private final WebClient.Builder webClientBuilder;

    @Value("${project.service.url:http://localhost:8222}")
    private String projectServiceUrl;

    @Value("${skill.service.url:http://localhost:8222}")
    private String skillServiceUrl;

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    private static final int MAX_APPLICATIONS = 10;

    private Path coverLetterPath() {
        return Paths.get(uploadDir, "cover-letters");
    }

    public Application submit(ApplicationRequestDto dto) {
        if (applicationRepo.existsByFreelancerIdAndProjectId(dto.getFreelancerId(), dto.getProjectId())) {
            throw new IllegalStateException("Vous avez déjà postulé à ce projet.");
        }
        long count = applicationRepo.countByFreelancerId(dto.getFreelancerId());
        if (count >= MAX_APPLICATIONS) {
            throw new IllegalStateException("Quota maximum de " + MAX_APPLICATIONS + " candidatures atteint.");
        }
        Application app = Application.builder()
                .freelancerId(dto.getFreelancerId())
                .projectId(dto.getProjectId())
                .coverLetterUrl(dto.getCoverLetterUrl())
                .build();
        log.info("📝 Application submitted: freelancerId={} projectId={}", dto.getFreelancerId(), dto.getProjectId());
        return applicationRepo.save(app);
    }

    @Transactional(readOnly = true)
    public boolean alreadyApplied(Long freelancerId, Long projectId) {
        return applicationRepo.existsByFreelancerIdAndProjectId(freelancerId, projectId);
    }

    @Transactional(readOnly = true)
    public List<Application> getByFreelancer(Long freelancerId) {
        return applicationRepo.findByFreelancerId(freelancerId);
    }

    @Transactional(readOnly = true)
    public List<Application> getByProject(Long projectId) {
        return applicationRepo.findByProjectId(projectId);
    }
    public Application acceptApplication(Long applicationId) {
        Application app = applicationRepo.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Application not found: " + applicationId));
        app.setAccepted(true);
        log.info("✅ Application accepted: id={}", applicationId);
        return applicationRepo.save(app);
    }

    public String uploadCoverLetter(Long freelancerId, MultipartFile file) throws IOException {
        Path uploadPath = coverLetterPath();
        Files.createDirectories(uploadPath);
        String filename = "cover_" + freelancerId + "_" + UUID.randomUUID() + ".pdf";
        Path dest = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        String url = "/uploads/cover-letters/" + filename;
        log.info("📎 Cover letter uploaded: {}", url);
        return url;
    }

    public String generateCoverLetter(Long freelancerId, Long projectId) throws IOException {
        // Call project-service
        ProjectDto project = webClientBuilder.build()
                .get()
                .uri(projectServiceUrl + "/api/projects/" + projectId)
                .retrieve()
                .bodyToMono(ProjectDto.class)
                .block();

        if (project == null) throw new IllegalArgumentException("Project not found: " + projectId);

        // Call skill-service
        List<SkillDto> skills = webClientBuilder.build()
                .get()
                .uri(skillServiceUrl + "/api/skills/freelancer/" + freelancerId)
                .retrieve()
                .bodyToFlux(SkillDto.class)
                .collectList()
                .block();

        Path uploadPath = coverLetterPath();
        Files.createDirectories(uploadPath);
        String filename = "cover_generated_" + freelancerId + "_" + UUID.randomUUID() + ".pdf";
        Path dest = uploadPath.resolve(filename);

        Document document = new Document(PageSize.A4, 60, 60, 80, 80);
        PdfWriter.getInstance(document, new FileOutputStream(dest.toFile()));
        document.open();

        Font titleFont  = new Font(Font.HELVETICA, 18, Font.BOLD,  new Color(30, 90, 160));
        Font normalFont = new Font(Font.HELVETICA, 11, Font.NORMAL, Color.DARK_GRAY);
        Font boldFont   = new Font(Font.HELVETICA, 11, Font.BOLD,   Color.DARK_GRAY);
        Font subFont    = new Font(Font.HELVETICA, 13, Font.BOLD,   new Color(50, 50, 50));

        Paragraph header = new Paragraph("Freelancer #" + freelancerId, titleFont);
        header.setAlignment(Element.ALIGN_LEFT);
        document.add(header);
        document.add(new Paragraph(LocalDate.now().toString(), normalFont));
        document.add(Chunk.NEWLINE);
        document.add(new Paragraph("─────────────────────────────────────────────", normalFont));
        document.add(Chunk.NEWLINE);

        Paragraph objet = new Paragraph();
        objet.add(new Chunk("Objet : ", boldFont));
        objet.add(new Chunk("Candidature pour le projet « " + project.getTitle() + " »", normalFont));
        document.add(objet);
        document.add(Chunk.NEWLINE);
        document.add(new Paragraph("Madame, Monsieur,", normalFont));
        document.add(Chunk.NEWLINE);

        String intro = "Je me permets de vous adresser ma candidature pour le projet « "
                + project.getTitle() + " » publie sur votre plateforme. "
                + "Fort(e) de mon experience en developpement et de mes competences techniques, "
                + "je suis convaincu(e) de pouvoir apporter une contribution significative a votre equipe.";
        document.add(new Paragraph(intro, normalFont));
        document.add(Chunk.NEWLINE);

        if (skills != null && !skills.isEmpty()) {
            document.add(new Paragraph("Mes competences cles :", subFont));
            document.add(Chunk.NEWLINE);
            for (SkillDto skill : skills) {
                document.add(new Paragraph("• " + skill.getSkillName()
                        + " — Niveau : " + skill.getLevel()
                        + " — " + skill.getYearsExperience() + " an(s) d'experience", normalFont));
            }
            document.add(Chunk.NEWLINE);
        }

        if (project.getDescription() != null) {
            document.add(new Paragraph("Votre projet correspond parfaitement a mes domaines d'expertise. "
                    + "Je suis particulierement motuve(e) par : " + project.getDescription(), normalFont));
            document.add(Chunk.NEWLINE);
        }

        document.add(new Paragraph("Je reste disponible pour tout entretien ou echange complementaire. "
                + "Dans l'attente de votre retour, je vous adresse mes cordiales salutations.", normalFont));
        document.add(Chunk.NEWLINE);
        document.add(Chunk.NEWLINE);
        document.add(new Paragraph("Freelancer #" + freelancerId, boldFont));
        document.close();

        String url = "/uploads/cover-letters/" + filename;
        log.info("📝 Cover letter generated: {}", url);
        return url;
    }

    @Transactional(readOnly = true)
    public long countByFreelancer(Long freelancerId) {
        return applicationRepo.countByFreelancerId(freelancerId);
    }
}