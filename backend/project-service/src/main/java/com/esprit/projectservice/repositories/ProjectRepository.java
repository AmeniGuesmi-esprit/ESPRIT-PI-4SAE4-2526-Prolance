package com.esprit.projectservice.repositories;

import com.esprit.projectservice.entities.Project;
import com.esprit.projectservice.entities.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByClientId(Integer clientId);
    List<Project> findByStatus(ProjectStatus status);
    List<Project> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(String title, String description);
}
