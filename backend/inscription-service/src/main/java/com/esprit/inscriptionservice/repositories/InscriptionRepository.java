package com.esprit.inscriptionservice.repositories;

import com.esprit.inscriptionservice.entities.EventInscription;
import com.esprit.inscriptionservice.entities.InscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InscriptionRepository extends JpaRepository<EventInscription, Long> {

    List<EventInscription> findByEventId(Long eventId);

    List<EventInscription> findByUserId(Long userId);

    List<EventInscription> findByEventIdAndStatus(Long eventId, InscriptionStatus status);



    @Query("SELECT CASE WHEN COUNT(i) > 0 THEN true ELSE false END FROM EventInscription i WHERE i.userId = :userId AND i.eventId = :eventId")
    boolean existsByUserIdAndEventId(@Param("userId") Long userId, @Param("eventId") Long eventId);

    @Query("SELECT COUNT(i) FROM EventInscription i WHERE i.eventId = :eventId AND i.status <> :excludedStatus")
    long countByEventIdAndStatusNot(@Param("eventId") Long eventId, @Param("excludedStatus") InscriptionStatus excludedStatus);

    // FIFO: oldest waitlistDate first, limited to N entries
    @Query("SELECT i FROM EventInscription i " +
            "WHERE i.eventId = :eventId AND i.status = 'WAITLIST' " +
            "ORDER BY i.waitlistDate ASC")
    List<EventInscription> findWaitlistByEventIdOrderedFIFO(@Param("eventId") Long eventId);

    long countByEventIdAndStatus(Long eventId, InscriptionStatus status);
}
