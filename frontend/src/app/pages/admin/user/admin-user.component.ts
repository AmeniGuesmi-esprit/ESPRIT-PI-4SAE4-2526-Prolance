import { Component, OnInit } from '@angular/core';
import { AdminUser, UserRole } from './models/user.model';
import { AdminUsersService } from '../../../services/admin-users.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-user.component.html',
  styleUrls: ['./admin-user.component.css']
})
export class AdminUsersComponent implements OnInit {

  users: AdminUser[] = [];
  isLoading = false;

  // ── Toast ──
  showToast    = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // ── KPI counts ──
  adminCount      = 0;
  clientCount     = 0;
  freelancerCount = 0;

  // ── Animation ──
  fadingOutUsers: Set<number> = new Set();

  // ── Shared modal state ──
  selectedUser: AdminUser | null = null;
  actionReason = '';

  // ── Timeout modal ──
  showTimeoutModal  = false;
  selectedDuration  = '24h';
  timeoutDurations  = [
    { label: '1 Hour',   value: '1h'  },
    { label: '6 Hours',  value: '6h'  },
    { label: '24 Hours', value: '24h' },
    { label: '3 Days',   value: '3d'  },
    { label: '7 Days',   value: '7d'  },
    { label: '30 Days',  value: '30d' },
  ];

  // ── Report modal ──
  showReportModal = false;
  reportCategory  = 'spam';

  // ── AI Verdict (Feature 1) ──────────────────────────────────────────
  aiVerdict: { severity: string; action: string; justification: string } | null = null;
  isAnalysing = false;

  private readonly API = 'http://localhost:8222';

  constructor(private usersService: AdminUsersService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  private getToken(): string | null {
    const stored = localStorage.getItem('sessionUser');
    if (!stored) return null;
    try { return JSON.parse(stored).token; } catch { return null; }
  }

  // ══════════════════════════════════════════
  // DATA
  // ══════════════════════════════════════════

  loadUsers(): void {
    this.isLoading = true;
    this.usersService.getAll().subscribe({
      next: (data) => {
        this.users = data;
        this.updateCounts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showNotification('Failed to load users', 'error');
        this.users     = [];
        this.isLoading = false;
      }
    });
  }

  updateCounts(): void {
    this.adminCount      = this.users.filter(u => u.role === 'ADMIN').length;
    this.clientCount     = this.users.filter(u => u.role === 'CLIENT').length;
    this.freelancerCount = this.users.filter(u => u.role === 'FREELANCER').length;
  }

  // ══════════════════════════════════════════
  // DISPLAY HELPERS
  // ══════════════════════════════════════════

  getAvatar(user: AdminUser): string {
    const first = (user?.name || '').charAt(0);
    const last  = (user?.lastName || '').charAt(0);
    return (first + last || 'U').toUpperCase();
  }

  getRoleLabel(role: UserRole): string {
    if (!role) return 'User';
    return role.charAt(0) + role.slice(1).toLowerCase();
  }

  getRoleClass(role: UserRole): string {
    return role ? `role-${role.toLowerCase()}` : '';
  }

  getStatusLabel(user: AdminUser): string {
    if (!user.enabled) return 'Deactivated';
    if (user.timedOut) return 'Timed Out';
    return 'Active';
  }

  getStatusClass(user: AdminUser): string {
    if (!user.enabled) return 'badge-disabled';
    if (user.timedOut) return 'badge-timeout';
    return 'badge-active';
  }

  isFadingOut(id: number): boolean {
    return this.fadingOutUsers.has(id);
  }

  getSeverityClass(severity: string): string {
    return ({
      low:    'ai-severity-low',
      medium: 'ai-severity-medium',
      high:   'ai-severity-high'
    } as Record<string, string>)[severity] ?? 'ai-severity-medium';
  }

  getActionClass(action: string): string {
    return ({
      warn:       'ai-action-warn',
      timeout:    'ai-action-timeout',
      deactivate: 'ai-action-deactivate'
    } as Record<string, string>)[action] ?? 'ai-action-warn';
  }

  // ══════════════════════════════════════════
  // TIMEOUT
  // ══════════════════════════════════════════

  openTimeoutModal(user: AdminUser): void {
    this.selectedUser     = user;
    this.selectedDuration = '24h';
    this.actionReason     = '';
    this.showTimeoutModal = true;
  }

  confirmTimeout(): void {
    if (!this.selectedUser) return;

    const until = this.computeUntilIso(this.selectedDuration);
    const label = this.computeUntilDate(this.selectedDuration);

    this.usersService.timeout(this.selectedUser.id!, until).subscribe({
      next: () => {
        this.closeModals();
        this.loadUsers();
        this.showNotification(`${this.selectedUser!.name} timed out until ${label}`, 'success');
      },
      error: () => this.showNotification('Failed to apply timeout', 'error')
    });
  }

  liftTimeout(user: AdminUser): void {
    this.usersService.liftTimeout(user.id!).subscribe({
      next: () => {
        this.loadUsers();
        this.showNotification(`Timeout lifted for ${user.name}`, 'success');
      },
      error: () => this.showNotification('Failed to lift timeout', 'error')
    });
  }

  // ══════════════════════════════════════════
  // DEACTIVATE / REACTIVATE
  // ══════════════════════════════════════════

  toggleStatus(user: AdminUser): void {
    const action$ = user.enabled
      ? this.usersService.deactivate(user.id!)
      : this.usersService.reactivate(user.id!);

    action$.subscribe({
      next: () => {
        this.loadUsers();
        this.showNotification(
          `${user.name} has been ${user.enabled ? 'deactivated' : 'reactivated'}`,
          'success'
        );
      },
      error: () => this.showNotification('Failed to update user status', 'error')
    });
  }

  // ══════════════════════════════════════════
  // REPORT — Feature 1 AI Analysis (uses fetch to bypass interceptor)
  // ══════════════════════════════════════════

  openReportModal(user: AdminUser): void {
    this.selectedUser    = user;
    this.actionReason    = '';
    this.reportCategory  = 'spam';
    this.aiVerdict       = null;
    this.isAnalysing     = false;
    this.showReportModal = true;
  }

  analyseWithAi(): void {
    if (!this.selectedUser) return;

    this.isAnalysing = true;
    this.aiVerdict   = null;

    const token = this.getToken();

    fetch(`${this.API}/users/${this.selectedUser.id}/ai-report-analysis`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ category: this.reportCategory, reason: this.actionReason })
    })
    .then(res => res.json())
    .then((res: any) => {
      this.aiVerdict   = res;
      this.isAnalysing = false;
    })
    .catch(() => {
      this.aiVerdict = {
        severity:      'medium',
        action:        'warn',
        justification: 'AI analysis unavailable — proceed manually.'
      };
      this.isAnalysing = false;
    });
  }

  confirmReport(): void {
    if (!this.selectedUser) return;

    this.usersService.report(this.selectedUser.id!).subscribe({
      next: (res: any) => {
        this.closeModals();
        this.loadUsers();
        this.showNotification(res.message || `Report submitted for ${this.selectedUser!.name}`, 'success');
      },
      error: () => this.showNotification('Failed to submit report', 'error')
    });
  }

  // ══════════════════════════════════════════
  // EXCEL EXPORT
  // ══════════════════════════════════════════

  exportToExcel(): void {
    const exportData = this.users.map(u => ({
      'Name':          `${u.name} ${u.lastName}`,
      'Email':         u.email,
      'Role':          this.getRoleLabel(u.role),
      'Status':        this.getStatusLabel(u),
      'Timeout Until': u.timeoutUntil || '—',
      'Report Count':  u.reportCount || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    ws['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 12 },
      { wch: 14 }, { wch: 16 }, { wch: 14 }
    ];
    XLSX.writeFile(wb, `users_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ══════════════════════════════════════════
  // SHARED HELPERS
  // ══════════════════════════════════════════

  closeModals(): void {
    this.showTimeoutModal = false;
    this.showReportModal  = false;
    this.selectedUser     = null;
    this.actionReason     = '';
    this.aiVerdict        = null;
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType    = type;
    this.showToast    = true;
    setTimeout(() => { this.showToast = false; }, 3000);
  }

  private computeUntilIso(duration: string): string {
    const map: Record<string, number> = {
      '1h': 1, '6h': 6, '24h': 24, '3d': 72, '7d': 168, '30d': 720
    };
    const d = new Date();
    d.setHours(d.getHours() + (map[duration] || 24));
    return d.toISOString().slice(0, 19);
  }

  private computeUntilDate(duration: string): string {
    const map: Record<string, number> = {
      '1h': 1, '6h': 6, '24h': 24, '3d': 72, '7d': 168, '30d': 720
    };
    const d = new Date();
    d.setHours(d.getHours() + (map[duration] || 24));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}