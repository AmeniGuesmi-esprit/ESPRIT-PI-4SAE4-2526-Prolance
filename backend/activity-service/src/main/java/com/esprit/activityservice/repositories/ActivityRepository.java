package com.esprit.activityservice.repositories;

import com.esprit.activityservice.entities.Activity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByEventId(Long eventId);
    void deleteByEventId(Long eventId);
}
