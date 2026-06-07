package tn.esprit.microservice.promoservice.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "promo_codes")
public class PromoCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private Integer discountPercent;

    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private Integer maxUses = 100;

    @Column(nullable = false)
    private Integer currentUses = 0;

    @Column(nullable = false)
    private Boolean isActive = true;

    private String description;

    // ✅ Getters manuels (sans Lombok)
    public Long getId() { return id; }
    public String getCode() { return code; }
    public Integer getDiscountPercent() { return discountPercent; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public Integer getMaxUses() { return maxUses; }
    public Integer getCurrentUses() { return currentUses; }
    public Boolean getIsActive() { return isActive; }
    public String getDescription() { return description; }

    // ✅ Setters
    public void setId(Long id) { this.id = id; }
    public void setCode(String code) { this.code = code; }
    public void setDiscountPercent(Integer discountPercent) { this.discountPercent = discountPercent; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public void setMaxUses(Integer maxUses) { this.maxUses = maxUses; }
    public void setCurrentUses(Integer currentUses) { this.currentUses = currentUses; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    public void setDescription(String description) { this.description = description; }

    // ✅ Méthodes métier
    public boolean isValid() {
        if (!isActive) return false;
        if (expiresAt != null && LocalDateTime.now().isAfter(expiresAt)) return false;
        return currentUses < maxUses;
    }

    public void incrementUses() {
        this.currentUses++;
    }
}