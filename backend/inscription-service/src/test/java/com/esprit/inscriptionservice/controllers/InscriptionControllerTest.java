package com.esprit.inscriptionservice.controllers;

import com.esprit.inscriptionservice.dto.InscriptionRequestDTO;
import com.esprit.inscriptionservice.dto.InscriptionResponseDTO;
import com.esprit.inscriptionservice.entities.InscriptionStatus;
import com.esprit.inscriptionservice.services.InscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InscriptionControllerTest {

    @Mock
    private InscriptionService inscriptionService;

    @InjectMocks
    private InscriptionController inscriptionController;

    private InscriptionResponseDTO responseDTO;
    private InscriptionRequestDTO requestDTO;

    @BeforeEach
    void setUp() {
        responseDTO = new InscriptionResponseDTO();
        responseDTO.setId(1L);
        responseDTO.setEventId(1L);
        responseDTO.setUserId(1L);
        responseDTO.setStatus(InscriptionStatus.PENDING);

        requestDTO = new InscriptionRequestDTO();
        requestDTO.setUserId(1L);
        requestDTO.setEventId(1L);
        requestDTO.setParticipantNom("Marah");
        requestDTO.setParticipantPrenom("Yesmine");
    }

    // ==================== submit ====================

    @Test
    void submit_shouldReturn201_whenValid() {
        when(inscriptionService.submitInscription(any())).thenReturn(responseDTO);

        ResponseEntity<InscriptionResponseDTO> response = inscriptionController.submit(requestDTO);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isEqualTo(responseDTO);
    }

    @Test
    void submit_shouldThrowBadRequest_whenServiceThrows() {
        when(inscriptionService.submitInscription(any()))
                .thenThrow(new IllegalArgumentException("Événement introuvable"));

        assertThatThrownBy(() -> inscriptionController.submit(requestDTO))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Événement introuvable");
    }

    // ==================== accept ====================

    @Test
    void accept_shouldReturn200() {
        responseDTO.setStatus(InscriptionStatus.ACCEPTED);
        when(inscriptionService.acceptInscription(1L)).thenReturn(responseDTO);

        ResponseEntity<InscriptionResponseDTO> response = inscriptionController.accept(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getStatus()).isEqualTo(InscriptionStatus.ACCEPTED);
    }

    // ==================== reject ====================

    @Test
    void reject_shouldReturn200() {
        responseDTO.setStatus(InscriptionStatus.REJECTED);
        when(inscriptionService.rejectInscription(1L)).thenReturn(responseDTO);

        ResponseEntity<InscriptionResponseDTO> response = inscriptionController.reject(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getStatus()).isEqualTo(InscriptionStatus.REJECTED);
    }

    // ==================== cancel ====================

    @Test
    void cancel_shouldReturn200() {
        responseDTO.setStatus(InscriptionStatus.CANCELLED);
        when(inscriptionService.cancelInscription(1L)).thenReturn(responseDTO);

        ResponseEntity<InscriptionResponseDTO> response = inscriptionController.cancel(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void cancel_shouldThrowBadRequest_whenServiceThrows() {
        when(inscriptionService.cancelInscription(1L))
                .thenThrow(new IllegalStateException("déjà annulée"));

        assertThatThrownBy(() -> inscriptionController.cancel(1L))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("déjà annulée");
    }

    // ==================== getByEvent ====================

    @Test
    void getByEvent_shouldReturnList() {
        when(inscriptionService.getAllInscriptionsByEvent(1L)).thenReturn(List.of(responseDTO));

        ResponseEntity<List<InscriptionResponseDTO>> response = inscriptionController.getByEvent(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    // ==================== getPending ====================

    @Test
    void getPending_shouldReturnList() {
        when(inscriptionService.getPendingInscriptions(1L)).thenReturn(List.of(responseDTO));

        ResponseEntity<List<InscriptionResponseDTO>> response = inscriptionController.getPending(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    // ==================== getByUser ====================

    @Test
    void getByUser_shouldReturnList() {
        when(inscriptionService.getInscriptionsByUser(1L)).thenReturn(List.of(responseDTO));

        ResponseEntity<List<InscriptionResponseDTO>> response = inscriptionController.getByUser(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    // ==================== getWaitlist ====================

    @Test
    void getWaitlist_shouldReturnList() {
        responseDTO.setStatus(InscriptionStatus.WAITLIST);
        when(inscriptionService.getWaitlistByEvent(1L)).thenReturn(List.of(responseDTO));

        ResponseEntity<List<InscriptionResponseDTO>> response = inscriptionController.getWaitlist(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    // ==================== downloadBadge ====================

    @Test
    void downloadBadge_shouldReturnBytes_whenFound() throws Exception {
        byte[] fakeBytes = new byte[]{1, 2, 3};
        when(inscriptionService.getBadgeBytes(1L)).thenReturn(fakeBytes);

        ResponseEntity<byte[]> response = inscriptionController.downloadBadge(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(fakeBytes);
    }

    @Test
    void downloadBadge_shouldReturn404_whenNotFound() throws Exception {
        when(inscriptionService.getBadgeBytes(99L)).thenThrow(new IllegalArgumentException("not found"));

        ResponseEntity<byte[]> response = inscriptionController.downloadBadge(99L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // ==================== delete ====================

    @Test
    void delete_shouldReturn204() {
        doNothing().when(inscriptionService).deleteInscription(1L);

        ResponseEntity<Void> response = inscriptionController.delete(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(inscriptionService).deleteInscription(1L);
    }

    // ==================== getCapacityStatus ====================

    @Test
    void getCapacityStatus_shouldReturnMap() {
        Map<String, Object> statusMap = Map.of(
                "eventId", 1L,
                "capacity", 100,
                "confirmedParticipants", 35L,
                "isFull", false
        );
        when(inscriptionService.getCapacityStatus(1L)).thenReturn(statusMap);

        ResponseEntity<Map<String, Object>> response = inscriptionController.getCapacityStatus(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsKey("capacity");
    }

    // ==================== isEventFull ====================

    @Test
    void isEventFull_shouldReturnFalse() {
        when(inscriptionService.isEventFull(1L)).thenReturn(false);

        ResponseEntity<Boolean> response = inscriptionController.isEventFull(1L);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isFalse();
    }

    // ==================== increaseCapacity ====================

    @Test
    void increaseCapacity_shouldReturnStatus() {
        Map<String, Object> statusMap = Map.of("capacity", 150, "isFull", false);
        doNothing().when(inscriptionService).handleCapacityIncrease(1L, 150);
        when(inscriptionService.getCapacityStatus(1L)).thenReturn(statusMap);

        ResponseEntity<Map<String, Object>> response = inscriptionController.increaseCapacity(1L, 150);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsKey("capacity");
    }

    @Test
    void increaseCapacity_shouldThrowBadRequest_whenServiceThrows() {
        doThrow(new IllegalStateException("Capacité invalide"))
                .when(inscriptionService).handleCapacityIncrease(1L, 0);

        assertThatThrownBy(() -> inscriptionController.increaseCapacity(1L, 0))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Capacité invalide");
    }
}
