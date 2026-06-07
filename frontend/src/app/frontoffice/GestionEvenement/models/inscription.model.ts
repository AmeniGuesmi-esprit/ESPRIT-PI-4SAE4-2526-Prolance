

export enum InscriptionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
   CANCELLED = 'CANCELLED',
    WAITLIST  = 'WAITLIST',
  PROMOTED  = 'PROMOTED'
}

export enum ParticipantRole {
  VISITEUR = 'VISITEUR',
  PARTICIPANT = 'PARTICIPANT',
  SPEAKER = 'SPEAKER',
  ANIMATOR = 'ANIMATOR',
  EXPERT = 'EXPERT'
}

export enum Domaine {
  DEVELOPMENT = 'DEVELOPMENT',
  DESIGN = 'DESIGN'
}

export interface EventInscriptionRequestDTO {
  participantNom: string;
  participantPrenom: string;
  participantEmail?: string;
  domaine: Domaine;
  participantRole: ParticipantRole;
  message?: string | null;
  imageUrl?: string | null;
  userId: number;
  eventId: number;

}

export interface EventInscriptionResponseDTO {
  id: number;
  participantNom: string;
  participantPrenom: string;
  participantEmail?: string;
  registrationDate: string;
  domaine: Domaine;
  participantRole: ParticipantRole;
  message?: string | null;     // ← présent ?
  imageUrl?: string;
  status: InscriptionStatus;
  badgeImagePath: string;
  userId: number;
  eventId: number;
  eventTitle: string;
   waitlistDate?:      string; 
   waitlistPosition?:  number;  
}

