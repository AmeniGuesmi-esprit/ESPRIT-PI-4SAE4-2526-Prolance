import { Subscription } from './subscription.model';

export interface UserSubscription {
  id?: number;
  userId: number;
  subscription?: Subscription;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED' | 'PENDING_PAYMENT';
  startDate: Date;
  endDate: Date;
  cancelledAt?: Date;
  autoRenew: boolean;
  currentProjects: number;
  currentProposals: number;
  amountPaid: number;
  paymentMethod?: string;
  transactionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  daysRemaining?: number;
  isExpiringSoon?: boolean;
}