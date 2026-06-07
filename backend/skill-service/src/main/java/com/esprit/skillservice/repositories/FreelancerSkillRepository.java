package com.esprit.skillservice.repositories;

import com.esprit.skillservice.entities.FreelancerSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FreelancerSkillRepository extends JpaRepository<FreelancerSkill, Long> {
    List<FreelancerSkill> findByFreelancerId(Long freelancerId);
    List<FreelancerSkill> findByProjectId(Long projectId);
}
