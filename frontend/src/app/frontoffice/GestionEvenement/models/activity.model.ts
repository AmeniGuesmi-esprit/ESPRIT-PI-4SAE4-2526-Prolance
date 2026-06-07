import { User } from './event.model';

export interface Activity {
  idActivity?: number;
  name: string;
  description: string;
  requirements: string;

  eventId?: number;
   user?: User;
}