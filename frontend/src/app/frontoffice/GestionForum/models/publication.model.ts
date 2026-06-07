export enum TypePublication {
  QUESTION = 'QUESTION',
  ARTICLE = 'ARTICLE',
  REVIEW = 'REVIEW'
}

export enum StatutPublication {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED'
  // PENDING supprimé
}

export interface User {
  id: number;
  name: string;
  lastName: string;
  role?: string;
}

export interface Publication {
  id?: number;
  titre: string;
  contenue: string;
  images?: string[];
  pdfs?: string[];
  createAt?: string;
  type: TypePublication;
  user?: User;
  commentaires?: any[];
  titleColor?: string;
  contentColor?: string;
  titleFontSize?: string;
  statut?: StatutPublication;
  signalements?: number[];
  signalementRaisons?: string[]; // raisons des signalements
}

export function getImageUrl(imageName: string): string {
  return `http://localhost:8222/uploads/publications/${imageName}`;
}

export function getPdfUrl(pdfName: string): string {
  return `http://localhost:8222/uploads/publications/${pdfName}`;
}