export interface Subscription {
  id?: number;
  name: string;
  type: 'CLIENT' | 'FREELANCER';
  price: number;
  billingCycle: 'SEMESTRIELLE' | 'ANNUELLE';
  description?: string;
  maxProjects?: number;
  maxProposals?: number;
  maxActiveJobs?: number;
  featuredListing: boolean;
  prioritySupport: boolean;
  analyticsAccess: boolean;
  isActive: boolean;
  activeSubscribersCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}