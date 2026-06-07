import { Activity } from './activity.model';

export enum EventStatus {
  PUBLISHED = 'PUBLISHED',
  PENDING = 'PENDING',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export enum CategoryEvent {
  CONFERENCE = 'CONFERENCE',
  WORKSHOP = 'WORKSHOP',
  NETWORKING = 'NETWORKING',
  HACKATHON = 'HACKATHON',
  SEMINAR = 'SEMINAR',
  TRAINING = 'TRAINING',
  TRADE_SHOW = 'TRADE_SHOW',
  COMPETITION = 'COMPETITION',
  BUSINESS_MEETING = 'BUSINESS_MEETING'
}

export interface User {
  id: number;
  name: string;
  lastName: string;
  role?: string;
}
export interface Event {
  idEvent?: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  eventStatus: EventStatus;
  location: string;
  archived?: boolean; 
  latitude?:           number;   // ← AJOUTER
  longitude?:          number; 
  capacity: number;
  currentParticipants?: number;
  imageUrl?: string;
  category: CategoryEvent;
  activities?: Activity[];
  createdAt?: string;
  updatedAt?: string;
 
}