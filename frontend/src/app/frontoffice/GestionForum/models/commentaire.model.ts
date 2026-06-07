import { User } from './publication.model';

export interface Commentaire {
  id?: number;
  contenue: string;
  createAt?: string;
  user?: User;
  publicationId?: number;
  parent?: Commentaire;           // ✅ commentaire parent (null si racine)
  replies?: Commentaire[];        // ✅ liste des réponses directes
  pinned?: boolean;               // ✅ commentaire épinglé par le créateur du post
}