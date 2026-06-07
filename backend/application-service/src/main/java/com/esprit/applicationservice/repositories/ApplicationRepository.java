package com.esprit.applicationservice.repositories;

import com.esprit.applicationservice.entities.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByFreelancerId(Long freelancerId);
    List<Application> findByProjectId(Long projectId);
    boolean existsByFreelancerIdAndProjectId(Long freelancerId, Long projectId);
    long countByFreelancerId(Long freelancerId);
    Optional<Application> findByFreelancerIdAndProjectId(Long freelancerId, Long projectId);
}
