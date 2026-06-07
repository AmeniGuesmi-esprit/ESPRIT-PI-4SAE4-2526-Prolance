package com.esprit.eventservice.specifications;

import com.esprit.eventservice.dto.EventFilterDTO;
import com.esprit.eventservice.entities.Event;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class EventSpecification {

    // ✅ Fix 1: constructeur privé pour cacher le constructeur public implicite
    private EventSpecification() {
        // Utility class — ne pas instancier
    }

    public static Specification<Event> buildFromFilter(EventFilterDTO filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get("archived"), false));

            // ✅ Fix 2: extraire les prédicats texte dans un helper pour réduire la complexité
            addTextPredicates(filter, root, cb, predicates);

            // ✅ Fix 3: extraire les prédicats enum
            addEnumPredicates(filter, root, cb, predicates);

            // ✅ Fix 4: extraire les prédicats de dates
            addDatePredicates(filter, root, cb, predicates);

            // ✅ Fix 5: extraire les prédicats numériques
            addNumericPredicates(filter, root, cb, predicates);

            if (filter.getUserId() != null) {
                predicates.add(cb.equal(root.get("userId"), filter.getUserId()));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void addTextPredicates(EventFilterDTO filter,
                                          jakarta.persistence.criteria.Root<Event> root,
                                          jakarta.persistence.criteria.CriteriaBuilder cb,
                                          List<Predicate> predicates) {
        if (isNotBlank(filter.getTitleContains())) {
            predicates.add(cb.like(cb.lower(root.get("title")),
                    "%" + filter.getTitleContains().toLowerCase().trim() + "%"));
        }
        if (isNotBlank(filter.getLocationContains())) {
            predicates.add(cb.like(cb.lower(root.get("location")),
                    "%" + filter.getLocationContains().toLowerCase().trim() + "%"));
        }
        if (isNotBlank(filter.getDescriptionContains())) {
            predicates.add(cb.like(cb.lower(root.get("description")),
                    "%" + filter.getDescriptionContains().toLowerCase().trim() + "%"));
        }
    }

    private static void addEnumPredicates(EventFilterDTO filter,
                                          jakarta.persistence.criteria.Root<Event> root,
                                          jakarta.persistence.criteria.CriteriaBuilder cb,
                                          List<Predicate> predicates) {
        if (filter.getStatus() != null) {
            predicates.add(cb.equal(root.get("eventStatus"), filter.getStatus()));
        }
        if (filter.getCategory() != null) {
            predicates.add(cb.equal(root.get("category"), filter.getCategory()));
        }
    }

    private static void addDatePredicates(EventFilterDTO filter,
                                          jakarta.persistence.criteria.Root<Event> root,
                                          jakarta.persistence.criteria.CriteriaBuilder cb,
                                          List<Predicate> predicates) {
        if (filter.getStartDateFrom() != null) {
            predicates.add(cb.greaterThanOrEqualTo(
                    root.<LocalDateTime>get("startDate"), filter.getStartDateFrom()));
        }
        if (filter.getStartDateTo() != null) {
            predicates.add(cb.lessThanOrEqualTo(
                    root.<LocalDateTime>get("startDate"), filter.getStartDateTo()));
        }
        if (filter.getEndDateFrom() != null) {
            predicates.add(cb.greaterThanOrEqualTo(
                    root.<LocalDateTime>get("endDate"), filter.getEndDateFrom()));
        }
        if (filter.getEndDateTo() != null) {
            predicates.add(cb.lessThanOrEqualTo(
                    root.<LocalDateTime>get("endDate"), filter.getEndDateTo()));
        }
    }

    private static void addNumericPredicates(EventFilterDTO filter,
                                             jakarta.persistence.criteria.Root<Event> root,
                                             jakarta.persistence.criteria.CriteriaBuilder cb,
                                             List<Predicate> predicates) {
        if (filter.getCapacityMin() != null) {
            predicates.add(cb.greaterThanOrEqualTo(
                    root.<Integer>get("capacity"), filter.getCapacityMin()));
        }
        if (filter.getCapacityMax() != null) {
            predicates.add(cb.lessThanOrEqualTo(
                    root.<Integer>get("capacity"), filter.getCapacityMax()));
        }
        if (filter.getParticipantsMin() != null) {
            predicates.add(cb.greaterThanOrEqualTo(
                    root.<Integer>get("currentParticipants"), filter.getParticipantsMin()));
        }
        if (filter.getParticipantsMax() != null) {
            predicates.add(cb.lessThanOrEqualTo(
                    root.<Integer>get("currentParticipants"), filter.getParticipantsMax()));
        }
    }

    private static boolean isNotBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }
}