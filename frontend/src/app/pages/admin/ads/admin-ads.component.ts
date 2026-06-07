import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdCampaign, CampaignStatus } from '../../ads/models/ad.models';
import { AdsService } from '../../../services/ads.service';

@Component({
  selector: 'app-admin-ads',
  templateUrl: './admin-ads.component.html',
  styleUrls: ['./admin-ads.component.css']
})
export class AdminAdsComponent implements OnInit, OnDestroy {

  // ═══════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════

  // Inspect Drawer
  inspectDrawerOpen = false;
  inspectedCampaign: AdCampaign | null = null;

  // Reject Modal
  showRejectModal = false;
  rejectingCampaignId: number | null = null;
  rejectReason = '';

  // Delete Confirm
  showDeleteConfirm = false;
  deletingCampaignId: number | null = null;

  // Fade-out animation tracking
  fadingOutIds: Set<number> = new Set();

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;
  private toastTimer: any;

  // All campaigns (loaded from backend)
  campaigns: AdCampaign[] = [];

  isLoading = false;

  constructor(private adsService: AdsService) {}

  ngOnInit(): void {
    this.loadAllCampaigns();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  private loadAllCampaigns(): void {
    this.isLoading = true;
    this.adsService.getAllAdminCampaigns().subscribe({
      next: (data) => {
        this.campaigns = data;
        this.isLoading = false;
      },
      error: () => {
        this.campaigns = [];
        this.isLoading = false;
      }
    });
  }

  private displayToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.showToast = false, 4000);
  }

  // ═══════════════════════════════════════════════
  // COMPUTED VIEWS
  // ═══════════════════════════════════════════════

  get pendingCampaigns(): AdCampaign[] {
    return this.campaigns.filter(c => c.status === 'PENDING');
  }

  get activeCampaigns(): AdCampaign[] {
    return this.campaigns.filter(c => c.status === 'ACTIVE');
  }

  // ═══════════════════════════════════════════════
  // KPI STATS
  // ═══════════════════════════════════════════════

  get totalPending(): number {
    return this.pendingCampaigns.length;
  }

  get totalActive(): number {
    return this.activeCampaigns.length;
  }

  get totalImpressions(): number {
    return this.activeCampaigns.reduce((sum, c) => sum + (c.views || 0), 0);
  }

  get totalClicks(): number {
    return this.activeCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  }

  get totalRevenue(): number {
    return this.activeCampaigns.length * 39.99; // Avg plan cost mock
  }

  // ═══════════════════════════════════════════════
  // USER INFO HELPERS
  // ═══════════════════════════════════════════════

  // TODO: Enhance with userService.getUserById(userId) to display actual name/email.
  // The AdCampaign DTO includes userId; map to user identity once UserService endpoint is available.
  getUserAvatar(userId: number): string {
    const initials = 'U' + userId;
    return initials.substring(0, 2).toUpperCase();
  }

  getRoleBadge(campaign: AdCampaign): string {
    return campaign.roleType === 'FREELANCER' ? 'Freelancer' : 'Client';
  }

  hasImage(campaign: AdCampaign): boolean {
    return !!(campaign.imageUrl && campaign.imageUrl.trim() !== '');
  }

  getAdImage(campaign: AdCampaign): string {
    if (this.hasImage(campaign)) {
      return campaign.imageUrl;
    }
    return campaign.roleType === 'FREELANCER'
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(campaign.title)}`
      : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(campaign.title)}`;
  }

  onImgError(event: Event, campaign: AdCampaign): void {
    const img = event.target as HTMLImageElement;
    img.src = campaign.roleType === 'FREELANCER'
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(campaign.title)}`
      : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(campaign.title)}`;
  }

  // ═══════════════════════════════════════════════
  // APPROVE
  // ═══════════════════════════════════════════════

  approveCampaign(campaign: AdCampaign): void {
    this.adsService.adminApprove(campaign.id).subscribe({
      next: (updated) => {
        // Immediate local state sync — reflect DB status without waiting for reload
        campaign.status = 'ACTIVE';
        if (updated) Object.assign(campaign, updated);
        this.displayToast('Campaign approved successfully.', 'success');
        this.loadAllCampaigns();
      },
      error: () => {
        this.displayToast('Failed to approve campaign.', 'error');
      }
    });
  }

  // ═══════════════════════════════════════════════
  // REJECT (with reason)
  // ═══════════════════════════════════════════════

  openRejectModal(campaignId: number): void {
    this.rejectingCampaignId = campaignId;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectingCampaignId = null;
    this.rejectReason = '';
  }

  confirmReject(): void {
    if (this.rejectingCampaignId === null) return;
    const id = this.rejectingCampaignId;
    const reason = this.rejectReason.trim() || 'Rejected by admin.';
    this.showRejectModal = false;
    this.rejectingCampaignId = null;
    this.rejectReason = '';
    this.adsService.adminReject(id, reason).subscribe({
      next: (updated) => {
        // Immediate local state sync
        const local = this.campaigns.find(c => c.id === id);
        if (local) {
          local.status = 'REJECTED';
          local.rejectionReason = reason;
        }
        if (updated && local) Object.assign(local, updated);
        this.displayToast('Campaign rejected.', 'success');
        this.loadAllCampaigns();
      },
      error: () => {
        this.displayToast('Failed to reject campaign.', 'error');
      }
    });
  }

  // ═══════════════════════════════════════════════
  // FORCE STOP / DELETE (with fade-out)
  // ═══════════════════════════════════════════════

  openDeleteConfirm(campaignId: number): void {
    this.deletingCampaignId = campaignId;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingCampaignId = null;
  }

  confirmDelete(): void {
    if (this.deletingCampaignId === null) return;
    const id = this.deletingCampaignId;
    this.fadingOutIds.add(id);
    this.showDeleteConfirm = false;
    this.deletingCampaignId = null;

    this.adsService.adminDelete(id).subscribe({
      next: () => {
        setTimeout(() => {
          this.fadingOutIds.delete(id);
          this.displayToast('Campaign deleted.', 'success');
          this.loadAllCampaigns();
        }, 400);
      },
      error: () => {
        this.fadingOutIds.delete(id);
        this.displayToast('Failed to delete campaign.', 'error');
      }
    });
  }

  isFadingOut(campaignId: number): boolean {
    return this.fadingOutIds.has(campaignId);
  }

  // ═══════════════════════════════════════════════
  // INSPECT DRAWER
  // ═══════════════════════════════════════════════

  openInspect(campaign: AdCampaign): void {
    this.inspectedCampaign = campaign;
    this.inspectDrawerOpen = true;
  }

  closeInspect(): void {
    this.inspectDrawerOpen = false;
    setTimeout(() => {
      this.inspectedCampaign = null;
    }, 300);
  }

  // ═══════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════

  statusBadgeClass(status: CampaignStatus): string {
    switch (status) {
      case 'PENDING': return 'badge-warning';
      case 'ACTIVE': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      case 'EXPIRED': return 'badge-expired';
      default: return '';
    }
  }

  formatNumber(val: number): string {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return val.toString();
  }

  formatCurrency(val: number): string {
    return '$' + val.toFixed(2);
  }

  getSparklinePath(data: number[]): string {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data, 1);
    const width = 80;
    const height = 24;
    const step = width / (data.length - 1);
    return data.map((val, i) => {
      const x = i * step;
      const y = height - (val / max) * height;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  }

  getCTR(campaign: AdCampaign): string {
    if (!campaign.views || campaign.views === 0) return '0%';
    return ((campaign.clicks || 0) / campaign.views * 100).toFixed(1) + '%';
  }
}
