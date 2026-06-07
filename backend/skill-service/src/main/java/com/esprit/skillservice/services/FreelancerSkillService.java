package com.esprit.skillservice.services;

import com.esprit.skillservice.dto.SkillRequestDto;
import com.esprit.skillservice.entities.FreelancerSkill;
import com.esprit.skillservice.repositories.FreelancerSkillRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.lowagie.text.DocumentException;
import java.io.IOException;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

@Service @RequiredArgsConstructor @Slf4j @Transactional
public class FreelancerSkillService {

    private final FreelancerSkillRepository skillRepo;

    @Transactional(readOnly = true)
    public List<FreelancerSkill> getByFreelancer(Long freelancerId) {
        return skillRepo.findByFreelancerId(freelancerId);
    }

    @Transactional(readOnly = true)
    public List<FreelancerSkill> getByProject(Long projectId) {
        return skillRepo.findByProjectId(projectId);
    }

    public FreelancerSkill createForFreelancer(Long freelancerId, SkillRequestDto dto) {
        FreelancerSkill skill = FreelancerSkill.builder()
                .skillName(dto.getSkillName()).level(dto.getLevel())
                .yearsExperience(dto.getYearsExperience()).freelancerId(freelancerId).build();
        log.info("🔧 Skill created for freelancerId={}: {}", freelancerId, dto.getSkillName());
        return skillRepo.save(skill);
    }

    public void delete(Long skillId) {
        skillRepo.deleteById(skillId);
    }

    public byte[] generateResumePdf(Long freelancerId) {
        List<FreelancerSkill> skills = skillRepo.findByFreelancerId(freelancerId);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document doc = new Document(PageSize.A4, 50, 50, 60, 60);
            PdfWriter.getInstance(doc, out);
            doc.open();

            Color purple    = new Color(108, 43, 217);
            Color darkGray  = new Color(30, 30, 30);
            Color medGray   = new Color(100, 100, 100);
            Color lightGray = new Color(245, 245, 250);
            Color white     = Color.WHITE;

            Font nameFont    = new Font(Font.HELVETICA, 24, Font.BOLD, white);
            Font titleFont   = new Font(Font.HELVETICA, 11, Font.NORMAL, new Color(220, 200, 255));
            Font sectionFont = new Font(Font.HELVETICA, 13, Font.BOLD, purple);
            Font skillName   = new Font(Font.HELVETICA, 11, Font.BOLD, darkGray);
            Font skillMeta   = new Font(Font.HELVETICA, 10, Font.NORMAL, medGray);
            Font labelFont   = new Font(Font.HELVETICA, 9, Font.BOLD, white);

            // Header Banner
            PdfPTable header = new PdfPTable(1);
            header.setWidthPercentage(100);
            PdfPCell headerCell = new PdfPCell();
            headerCell.setBackgroundColor(purple);
            headerCell.setPadding(24);
            headerCell.setBorder(Rectangle.NO_BORDER);
            Paragraph name = new Paragraph("Freelancer Profile", nameFont);
            name.setAlignment(Element.ALIGN_LEFT);
            headerCell.addElement(name);
            Paragraph subtitle = new Paragraph("Prolance Platform  •  Professional Resume", titleFont);
            subtitle.setSpacingBefore(4);
            headerCell.addElement(subtitle);
            header.addCell(headerCell);
            doc.add(header);
            doc.add(Chunk.NEWLINE);

            // Skills Section
            Paragraph skillsTitle = new Paragraph("TECHNICAL SKILLS", sectionFont);
            skillsTitle.setSpacingBefore(8);
            skillsTitle.setSpacingAfter(4);
            doc.add(skillsTitle);

            PdfPTable line = new PdfPTable(1);
            line.setWidthPercentage(100);
            PdfPCell lineCell = new PdfPCell(new Phrase(" "));
            lineCell.setBackgroundColor(purple);
            lineCell.setBorder(Rectangle.NO_BORDER);
            lineCell.setFixedHeight(2f);
            line.addCell(lineCell);
            doc.add(line);
            doc.add(Chunk.NEWLINE);

            PdfPTable skillsTable = new PdfPTable(2);
            skillsTable.setWidthPercentage(100);
            skillsTable.setSpacingBefore(4);

            for (FreelancerSkill skill : skills) {
                PdfPCell cell = new PdfPCell();
                cell.setBorder(Rectangle.BOX);
                cell.setBorderColor(new Color(220, 220, 235));
                cell.setBackgroundColor(lightGray);
                cell.setPadding(12);
                cell.addElement(new Paragraph(skill.getSkillName().toUpperCase(), skillName));
                String levelText = skill.getLevel() != null ? skill.getLevel() : "N/A";
                Color badgeColor;
                if ("EXPERT".equals(levelText)) {
                    badgeColor = new Color(34, 197, 94);
                } else if ("INTERMEDIATE".equals(levelText)) {
                    badgeColor = new Color(59, 130, 246);
                } else {
                    badgeColor = new Color(156, 163, 175);
                }
                Paragraph level = new Paragraph(levelText, new Font(Font.HELVETICA, 9, Font.BOLD, badgeColor));
                level.setSpacingBefore(3);
                cell.addElement(level);
                Paragraph years = new Paragraph(skill.getYearsExperience() + " year(s) experience", skillMeta);
                years.setSpacingBefore(2);
                cell.addElement(years);
                skillsTable.addCell(cell);
            }

            if (skills.size() % 2 != 0) {
                PdfPCell empty = new PdfPCell(new Phrase(" "));
                empty.setBorder(Rectangle.NO_BORDER);
                skillsTable.addCell(empty);
            }
            doc.add(skillsTable);
            doc.add(Chunk.NEWLINE);

            // Summary Stats
            Paragraph statsTitle = new Paragraph("PROFILE SUMMARY", sectionFont);
            statsTitle.setSpacingBefore(8);
            statsTitle.setSpacingAfter(4);
            doc.add(statsTitle);

            PdfPTable statsLine = new PdfPTable(1);
            statsLine.setWidthPercentage(100);
            PdfPCell statsLineCell = new PdfPCell(new Phrase(" "));
            statsLineCell.setBackgroundColor(purple);
            statsLineCell.setBorder(Rectangle.NO_BORDER);
            statsLineCell.setFixedHeight(2f);
            statsLine.addCell(statsLineCell);
            doc.add(statsLine);
            doc.add(Chunk.NEWLINE);

            long expertCount = skills.stream().filter(s -> "EXPERT".equals(s.getLevel())).count();
            long totalYears  = skills.stream().mapToLong(FreelancerSkill::getYearsExperience).sum();

            PdfPTable stats = new PdfPTable(3);
            stats.setWidthPercentage(100);
            String[] statLabels = {"Total Skills", "Expert Level", "Total Experience"};
            String[] statValues = {String.valueOf(skills.size()), String.valueOf(expertCount), totalYears + " yrs"};

            for (int i = 0; i < 3; i++) {
                PdfPCell sc = new PdfPCell();
                sc.setBackgroundColor(purple);
                sc.setPadding(12);
                sc.setBorder(Rectangle.NO_BORDER);
                sc.setHorizontalAlignment(Element.ALIGN_CENTER);
                Paragraph val = new Paragraph(statValues[i], new Font(Font.HELVETICA, 18, Font.BOLD, white));
                val.setAlignment(Element.ALIGN_CENTER);
                sc.addElement(val);
                Paragraph lbl = new Paragraph(statLabels[i], labelFont);
                lbl.setAlignment(Element.ALIGN_CENTER);
                sc.addElement(lbl);
                stats.addCell(sc);
            }
            doc.add(stats);

            doc.add(Chunk.NEWLINE);
            Paragraph footer = new Paragraph("Generated by Prolance • " + java.time.LocalDate.now(),
                    new Font(Font.HELVETICA, 9, Font.ITALIC, medGray));
            footer.setAlignment(Element.ALIGN_CENTER);
            doc.add(footer);

            doc.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            throw new IllegalStateException("Error generating PDF", e);

    }
    }
}
