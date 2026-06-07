export type ReactionType = 'LIKE' | 'DISLIKE' | 'HEART';

export interface ReactorDTO {
  userId:   number;
  userName: string;   // "Prénom Nom" from backend
  type:     ReactionType;
}

export interface ReactionSummaryDTO {
  LIKE:         number;
  DISLIKE:      number;
  HEART:        number;
  userReaction: ReactionType | null;
  reactors:     ReactorDTO[];
}