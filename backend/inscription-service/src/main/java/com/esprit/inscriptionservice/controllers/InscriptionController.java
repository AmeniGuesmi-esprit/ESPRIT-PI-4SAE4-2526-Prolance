package com.esprit.inscriptionservice.controllers;

import com.esprit.inscriptionservice.dto.InscriptionRequestDTO;
import com.esprit.inscriptionservice.dto.InscriptionResponseDTO;
import com.esprit.inscriptionservice.services.InscriptionService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inscriptions")
public class InscriptionController {

    private final InscriptionService inscriptionService;

    public InscriptionController(InscriptionService inscriptionService) {
        this.inscriptionService = inscriptionService;
    }

    @PostMapping
    public ResponseEntity<InscriptionResponseDTO> submit(@RequestBody InscriptionRequestDTO request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(inscriptionService.submitInscription(request));
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @PutMapping("/{id}/accept")
    public ResponseEntity<InscriptionResponseDTO> accept(@PathVariable Long id) {
        return ResponseEntity.ok(inscriptionService.acceptInscription(id));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<InscriptionResponseDTO> reject(@PathVariable Long id) {
        return ResponseEntity.ok(inscriptionService.rejectInscription(id));
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<InscriptionResponseDTO>> getByEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(inscriptionService.getAllInscriptionsByEvent(eventId));
    }

    @GetMapping("/event/{eventId}/pending")
    public ResponseEntity<List<InscriptionResponseDTO>> getPending(@PathVariable Long eventId) {
        return ResponseEntity.ok(inscriptionService.getPendingInscriptions(eventId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<InscriptionResponseDTO>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(inscriptionService.getInscriptionsByUser(userId));
    }

    @GetMapping("/{id}/badge")
    public ResponseEntity<byte[]> downloadBadge(@PathVariable Long id) {
        try {
            byte[] badgeBytes = inscriptionService.getBadgeBytes(id);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentDispositionFormData("attachment", "badge_" + id + ".png");
            return new ResponseEntity<>(badgeBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inscriptionService.deleteInscription(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/event/{eventId}/capacity-status")
    public ResponseEntity<Map<String, Object>> getCapacityStatus(@PathVariable Long eventId) {
        return ResponseEntity.ok(inscriptionService.getCapacityStatus(eventId));
    }

    @GetMapping("/event/{eventId}/is-full")
    public ResponseEntity<Boolean> isEventFull(@PathVariable Long eventId) {
        return ResponseEntity.ok(inscriptionService.isEventFull(eventId));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<InscriptionResponseDTO> cancel(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(inscriptionService.cancelInscription(id));
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }

    @GetMapping("/event/{eventId}/waitlist")
    public ResponseEntity<List<InscriptionResponseDTO>> getWaitlist(@PathVariable Long eventId) {
        return ResponseEntity.ok(inscriptionService.getWaitlistByEvent(eventId));
    }

    @PutMapping("/event/{eventId}/capacity")
    public ResponseEntity<Map<String, Object>> increaseCapacity(
            @PathVariable Long eventId,
            @RequestParam int newCapacity) {
        try {
            inscriptionService.handleCapacityIncrease(eventId, newCapacity);
            return ResponseEntity.ok(inscriptionService.getCapacityStatus(eventId));
        } catch (RuntimeException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
}