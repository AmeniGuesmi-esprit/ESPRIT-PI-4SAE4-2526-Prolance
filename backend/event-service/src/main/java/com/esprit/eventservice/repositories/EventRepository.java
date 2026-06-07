package com.esprit.eventservice.repositories;

import com.esprit.eventservice.entities.CategoryEvent;
import com.esprit.eventservice.entities.Event;
import com.esprit.eventservice.entities.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {

    List<Event> findByUserId(Long userId);
    List<Event> findByArchivedFalse();
    List<Event> findByArchivedTrue();
    List<Event> findByLatitudeIsNull();

    Page<Event> findByArchivedFalse(Pageable pageable);
    Page<Event> findByEventStatus(EventStatus status, Pageable pageable);
    Page<Event> findByCategory(CategoryEvent category, Pageable pageable);
    Page<Event> findByUserId(Long userId, Pageable pageable);

    long countByEventStatus(EventStatus status);
    long countByCategory(CategoryEvent category);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.startDate >= :from AND e.startDate <= :to")
    long countByStartDateBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
        SELECT e FROM Event e
        WHERE (:keyword IS NULL
               OR LOWER(e.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(e.location) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(e.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """)
    Page<Event> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
