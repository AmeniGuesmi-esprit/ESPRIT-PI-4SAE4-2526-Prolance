import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventInscriptionRequestDTO, EventInscriptionResponseDTO } from '../models/inscription.model';


@Injectable({ providedIn: 'root' })
export class InscriptionService {

  private apiUrl = 'http://localhost:8222/api/inscriptions';

  constructor(private http: HttpClient) {}

  // USER
  submitInscription(request: EventInscriptionRequestDTO): Observable<EventInscriptionResponseDTO> {
    return this.http.post<EventInscriptionResponseDTO>(this.apiUrl, request);
  }

  getMesInscriptions(userId: number): Observable<EventInscriptionResponseDTO[]> {
    return this.http.get<EventInscriptionResponseDTO[]>(`${this.apiUrl}/user/${userId}`);
  }

  // ADMIN
  getInscriptionsByEvent(eventId: number): Observable<EventInscriptionResponseDTO[]> {
    return this.http.get<EventInscriptionResponseDTO[]>(`${this.apiUrl}/event/${eventId}`);
  }

  getPendingInscriptions(eventId: number): Observable<EventInscriptionResponseDTO[]> {
    return this.http.get<EventInscriptionResponseDTO[]>(`${this.apiUrl}/event/${eventId}/pending`);
  }

  acceptInscription(id: number): Observable<EventInscriptionResponseDTO> {
    return this.http.put<EventInscriptionResponseDTO>(`${this.apiUrl}/${id}/accept`, {});
  }

  rejectInscription(id: number): Observable<EventInscriptionResponseDTO> {
    return this.http.put<EventInscriptionResponseDTO>(`${this.apiUrl}/${id}/reject`, {});
  }

  deleteInscription(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  downloadBadge(id: number): Observable<Blob> {
    
  return this.http.get(`${this.apiUrl}/${id}/badge`, { responseType: 'blob' });
  }

  cancelInscription(id: number): Observable<EventInscriptionResponseDTO> {
  return this.http.put<EventInscriptionResponseDTO>(`${this.apiUrl}/${id}/cancel`, {});
}

// Ajouter ces méthodes dans InscriptionService

getWaitlist(eventId: number): Observable<EventInscriptionResponseDTO[]> {
  return this.http.get<EventInscriptionResponseDTO[]>(`${this.apiUrl}/event/${eventId}/waitlist`);
}

increaseCapacity(eventId: number, newCapacity: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/event/${eventId}/capacity?newCapacity=${newCapacity}`, {});
}

getCapacityStatus(eventId: number): Observable<{
  eventId: number;
  capacity: number;
  confirmedParticipants: number;
  waitlistSize: number;
  isFull: boolean;
  isBeforeDeadline: boolean;
}> {
  return this.http.get<any>(`${this.apiUrl}/event/${eventId}/capacity-status`);
}
}