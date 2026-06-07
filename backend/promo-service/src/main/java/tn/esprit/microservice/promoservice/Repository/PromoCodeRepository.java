package tn.esprit.microservice.promoservice.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tn.esprit.microservice.promoservice.Entity.PromoCode;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PromoCodeRepository extends JpaRepository<PromoCode, Long> {

    Optional<PromoCode> findByCodeIgnoreCase(String code);


    @Query("SELECT p FROM PromoCode p WHERE p.isActive = true AND (p.expiresAt IS NULL OR p.expiresAt > :now) AND p.currentUses < p.maxUses")
    List<PromoCode> findAllValidPromos(LocalDateTime now);


    @Query("SELECT p FROM PromoCode p WHERE p.isActive = true AND p.expiresAt BETWEEN :now AND :soon")
    List<PromoCode> findExpiringSoon(LocalDateTime now, LocalDateTime soon);


    @Query("SELECT COUNT(p) FROM PromoCode p WHERE p.isActive = true")
    Long countActivePromos();

    @Query("SELECT SUM(p.currentUses) FROM PromoCode p")
    Long totalUsages();
}