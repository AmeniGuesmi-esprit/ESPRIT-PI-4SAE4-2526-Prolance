import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';
import { EventService, EventFilterParams, PageResponse } from '../../../frontoffice/GestionEvenement/services/event.service';
import { Event, CategoryEvent, EventStatus } from '../../../frontoffice/GestionEvenement/models/event.model';
import { AuthService } from 'app/services/auth.services';
import { EventInscriptionResponseDTO, InscriptionStatus } from '../../../frontoffice/GestionEvenement/models/inscription.model';
import { InscriptionService } from '../../../frontoffice/GestionEvenement/services/inscription.service';
import { BadgeGeneratorService } from '../../../frontoffice/GestionEvenement/services/badge-generator.service';
import { GroqService  } from '../../../frontoffice/GestionEvenement/services/groq.service';
import emailjs from '@emailjs/browser';
import { ActivityService } from 'app/frontoffice/GestionEvenement/services/activity.service';

const ALPHANUMERIC_PATTERN = /^[a-zA-Z0-9\u00C0-\u024F\s.,:''\-]+$/;
const NAME_PATTERN          = /^[a-zA-Z0-9\u00C0-\u024F\s]+$/;

function noEdgeSpacesValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = ctrl.value || '';
  return v !== v.trim() ? { edgeSpaces: true } : null;
}
function alphanumericValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = (ctrl.value || '').trim();
  return v.length === 0 ? null : ALPHANUMERIC_PATTERN.test(v) ? null : { specialChars: true };
}
function nameOnlyValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = (ctrl.value || '').trim();
  return v.length === 0 ? null : NAME_PATTERN.test(v) ? null : { specialChars: true };
}
function locationValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = (ctrl.value || '').trim();
  if (v.length === 0) return null;
  if (v.length < 3)   return { locationShort: true };
  if (/^\d+$/.test(v)) return { locationNumeric: true };
  if (!ALPHANUMERIC_PATTERN.test(v)) return { specialChars: true };
  return null;
}
function capacityValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v = ctrl.value;
  if (v === null || v === '') return null;
  if (!Number.isInteger(+v) || +v < 1) return { capacityMin: true };
  if (+v > 10_000) return { capacityMax: true };
  return null;
}
function futureDateValidator(ctrl: AbstractControl): ValidationErrors | null {
  if (!ctrl.value) return null;
  return new Date(ctrl.value).getTime() < Date.now() - 5 * 60_000 ? { pastDate: true } : null;
}
function endAfterStartValidator(group: AbstractControl): ValidationErrors | null {
  const s = group.get('startDate')?.value;
  const e = group.get('endDate')?.value;
  return s && e && new Date(e) <= new Date(s) ? { endBeforeStart: true } : null;
}

@Component({
  selector: 'app-admin-events',
  templateUrl: './admin-event.component.html',
  styleUrls: ['./admin-event.component.css']
})
export class AdminEventsComponent implements OnInit, OnDestroy {

  events: Event[]         = [];
  filteredEvents: Event[] = [];
  pageData: PageResponse<Event> | null = null;
  loading = false;
  selectedEvent?: Event;

  searchQuery    = '';
  statusFilter   = 'ALL';
  categoryFilter = 'ALL';

  showAdvancedFilters  = false;
  advLocation          = '';
  advActivity          = '';
  advStartDateFrom     = '';
  advStartDateTo       = '';
  advCapacityMin:     number | null = null;
  advCapacityMax:     number | null = null;
  advParticipantsMin: number | null = null;
  advParticipantsMax: number | null = null;

  currentPage = 0;
  pageSize    = 10;
  sortBy:  string          = 'idEvent';
  sortDir: 'asc' | 'desc' = 'desc';
  viewMode: 'list' | 'cards' = 'cards';

  statusOptions   = ['ALL', 'PUBLISHED', 'PENDING', 'CANCELLED', 'COMPLETED'];
  categoryOptions = ['ALL', 'CONFERENCE', 'WORKSHOP', 'NETWORKING', 'HACKATHON',
                     'SEMINAR', 'TRAINING', 'TRADE_SHOW', 'COMPETITION', 'BUSINESS_MEETING'];

  showModal   = false;
  isEditMode  = false;
  editEventId?: number;
  eventForm!: FormGroup;
  formLoading = false;
  formSuccess = '';
  formError   = '';
  submitted   = false;

  selectedFile: File | null   = null;
  imagePreview: string | null = null;
  isDragging = false;

  eventStatuses = Object.values(EventStatus);
  categories    = Object.values(CategoryEvent);
  activityLoading = false;

  // ── Delete/Archive Modal ──
  showDeleteModal = false;
  eventToDelete?: Event;
  deleteLoading   = false;

  // ── Archive Tab ──
  showArchivedModal  = false;          // ← NOUVEAU
  archivedEvents: Event[] = [];        // ← NOUVEAU
  archivedLoading    = false;          // ← NOUVEAU
  restoreLoading: { [id: number]: boolean } = {}; // ← NOUVEAU

  showRegistrationsModal   = false;
  registrations: EventInscriptionResponseDTO[] = [];
  registrationsLoading     = false;
  registrationsError       = '';
  registrationSearch       = '';
  registrationStatusFilter = 'ALL';
  registrationActionLoading: { [id: number]: boolean } = {};
  badgeDownloadLoading:      { [id: number]: boolean } = {};

  aiDescLoading = false;
  aiActivityLoading: { [index: number]: boolean } = {};

  // ── Waitlist ──

showCapacityModal  = false;
capacityModalEvent?: Event;
newCapacityValue:  number | null = null;
capacityStatus:    any = null;
capacityLoading    = false;

  showEmailModal        = false;
  emailModalMode: 'accept' | 'reject' = 'accept';
  emailTargetReg?: EventInscriptionResponseDTO;
  emailRejectionReason  = '';
  emailSending          = false;
  emailSuccess          = '';
  emailError            = '';

// ── Report ──
showReportModal   = false;
reportLoading     = false;
reportAIText      = '';
reportGenerated   = false;

  // ── AI Auto-Evaluation ──
autoEvaluateLoading  = false;
autoEvaluateProgress = { current: 0, total: 0 };
aiEvaluationReasons: { [id: number]: { decision: string; reason: string } } = {};

  private readonly EMAILJS_SERVICE_ID         = 'service_3d4iage';
  private readonly EMAILJS_ACCEPT_TEMPLATE_ID = 'template_md5sn32';
  private readonly EMAILJS_REJECT_TEMPLATE_ID = 'template_u8oom3n';
  private readonly EMAILJS_PUBLIC_KEY         = 'uo8rbIj37BtEt2dIX';

  private searchDebounce$   = new Subject<string>();
  private locationDebounce$ = new Subject<string>();
  private activityDebounce$ = new Subject<string>();
  private destroy$          = new Subject<void>();

  constructor(
    private eventService: EventService,
      private activityService: ActivityService, 
    private inscriptionService: InscriptionService,
    private authService: AuthService,
    private fb: FormBuilder,
    private badgeGenerator: BadgeGeneratorService,
    private groqService: GroqService,
  ) {}

  ngOnInit(): void {
    emailjs.init(this.EMAILJS_PUBLIC_KEY);
    this.initForm();
    this.loadAllEventsForStats();
    this.loadFilteredEvents();
    this.searchDebounce$.pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage = 0; this.loadFilteredEvents(); });
    this.locationDebounce$.pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage = 0; this.loadFilteredEvents(); });
    this.activityDebounce$.pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.currentPage = 0; this.loadFilteredEvents(); });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get activeAdvancedCount(): number {
    let n = 0;
    if (this.advLocation.trim())         n++;
    if (this.advActivity.trim())         n++;
    if (this.advStartDateFrom)           n++;
    if (this.advStartDateTo)             n++;
    if (this.advCapacityMin    != null)  n++;
    if (this.advCapacityMax    != null)  n++;
    if (this.advParticipantsMin != null) n++;
    if (this.advParticipantsMax != null) n++;
    return n;
  }

  loadAllEventsForStats(): void {
    this.eventService.getAllEvents().subscribe({ next: (data) => { this.events = data; }, error: () => {} });
  }

  loadFilteredEvents(): void {
    this.loading = true;
    const params: EventFilterParams = {
      titleContains:    this.searchQuery.trim()    || undefined,
      status:           this.statusFilter   !== 'ALL' ? this.statusFilter   : undefined,
      category:         this.categoryFilter !== 'ALL' ? this.categoryFilter : undefined,
      locationContains: this.advLocation.trim()  || undefined,
      startDateFrom:    this.advStartDateFrom ? `${this.advStartDateFrom}T00:00:00` : undefined,
      startDateTo:      this.advStartDateTo   ? `${this.advStartDateTo}T23:59:59`   : undefined,
      capacityMin:      this.advCapacityMin    ?? undefined,
      capacityMax:      this.advCapacityMax    ?? undefined,
      participantsMin:  this.advParticipantsMin ?? undefined,
      participantsMax:  this.advParticipantsMax ?? undefined,
      sortBy: this.sortBy, sortDir: this.sortDir, page: this.currentPage, size: this.pageSize,
    };
    this.eventService.filterEvents(params).subscribe({
      next: (page) => {
        this.pageData = page;
        const keyword = this.advActivity.trim().toLowerCase();
        this.filteredEvents = keyword
          ? page.content.filter(event => event.activities?.some(act =>
              act.name?.toLowerCase().includes(keyword) || act.description?.toLowerCase().includes(keyword)))
          : page.content;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearchChange(q: string): void   { this.searchQuery = q;   this.searchDebounce$.next(q); }
  onStatusChange(s: string): void   { this.statusFilter = s;   this.currentPage = 0; this.loadFilteredEvents(); }
  onCategoryChange(c: string): void { this.categoryFilter = c; this.currentPage = 0; this.loadFilteredEvents(); }
  onLocationInput(): void { this.locationDebounce$.next(this.advLocation); }
  onActivityInput(): void { this.activityDebounce$.next(this.advActivity); }
  applyAdvancedFilters(): void { this.currentPage = 0; this.loadFilteredEvents(); }

  resetAdvancedFilters(): void {
    this.advLocation = ''; this.advActivity = ''; this.advStartDateFrom = ''; this.advStartDateTo = '';
    this.advCapacityMin = null; this.advCapacityMax = null;
    this.advParticipantsMin = null; this.advParticipantsMax = null;
    this.sortBy = 'idEvent'; this.sortDir = 'desc'; this.currentPage = 0;
    this.loadFilteredEvents();
  }

  get totalPages(): number   { return this.pageData?.totalPages  ?? 0; }
  get hasPrevious(): boolean { return this.pageData?.hasPrevious ?? false; }
  get hasNext(): boolean     { return this.pageData?.hasNext     ?? false; }

  goToPage(p: number): void {
    if (p < 0 || p >= this.totalPages) return;
    this.currentPage = p; this.loadFilteredEvents();
  }
  prevPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }
  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i); }

  setView(m: 'list' | 'cards'): void { this.viewMode = m; }
  selectEvent(e: Event): void {
  this.selectedEvent = e;
  this.activityLoading = true;

  this.activityService.getActivitiesByEvent(e.idEvent!).subscribe({
    next: (activities) => {
      this.selectedEvent = { ...e, activities };
      this.activityLoading = false;
    },
    error: () => {
      this.selectedEvent = { ...e, activities: [] };
      this.activityLoading = false;
    }
  });
}

  closeEvent(): void                  { this.selectedEvent = undefined; }

  // ══════════════════════════════════════════════════
  //  ARCHIVE (remplace delete)
  // ══════════════════════════════════════════════════

  deleteEvent(event: Event): void {
    this.eventToDelete  = event;
    this.showDeleteModal = true;
    this.deleteLoading  = false;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.eventToDelete  = undefined;
  }

  confirmDelete(): void {
    if (!this.eventToDelete?.idEvent) return;
    this.deleteLoading = true;
    // ← appel archiveEvent au lieu de deleteEvent
    this.eventService.archiveEvent(this.eventToDelete.idEvent).subscribe({
      next: () => {
        if (this.selectedEvent?.idEvent === this.eventToDelete?.idEvent) {
          this.selectedEvent = undefined;
        }
        this.deleteLoading  = false;
        this.showDeleteModal = false;
        this.eventToDelete  = undefined;
        this.loadAllEventsForStats();
        this.loadFilteredEvents();
      },
      error: (err) => { console.error(err); this.deleteLoading = false; }
    });
  }

  // ══════════════════════════════════════════════════
  //  MODAL ÉVÉNEMENTS ARCHIVÉS
  // ══════════════════════════════════════════════════

  openArchivedModal(): void {
    this.showArchivedModal = true;
    this.loadArchivedEvents();
  }

  closeArchivedModal(): void {
    this.showArchivedModal = false;
    this.archivedEvents = [];
  }

  loadArchivedEvents(): void {
    this.archivedLoading = true;
    this.eventService.getArchivedEvents().subscribe({
      next: (data) => { this.archivedEvents = data; this.archivedLoading = false; },
      error: ()     => { this.archivedLoading = false; }
    });
  }

  restoreEvent(event: Event): void {
    if (!event.idEvent) return;
    this.restoreLoading[event.idEvent] = true;
    this.eventService.restoreEvent(event.idEvent).subscribe({
      next: () => {
        this.restoreLoading[event.idEvent!] = false;
        this.loadArchivedEvents();
        this.loadAllEventsForStats();
        this.loadFilteredEvents();
      },
      error: () => { this.restoreLoading[event.idEvent!] = false; }
    });
  }

  // ── Registration Modal ──
  openRegistrationsModal(): void {
    this.showRegistrationsModal = true; this.registrationsError = '';
    this.registrationSearch = ''; this.registrationStatusFilter = 'ALL';
    this.loadAllRegistrations();
  }

  closeRegistrationsModal(): void {
    this.showRegistrationsModal = false; this.registrations = []; this.registrationsError = '';
  }

  loadAllRegistrations(): void {
    this.registrationsLoading = true; this.registrationsError = ''; this.registrations = [];
    const eventIds = this.events.map(e => e.idEvent).filter((id): id is number => id != null);
    if (eventIds.length === 0) { this.registrationsLoading = false; return; }
    const requests = eventIds.map(id =>
      this.inscriptionService.getInscriptionsByEvent(id).pipe(catchError(() => of([] as EventInscriptionResponseDTO[])))
    );
    forkJoin(requests).subscribe({
      next: (results) => {
        const all = ([] as EventInscriptionResponseDTO[]).concat(...results);
        const seen = new Set<number>();
        this.registrations = all
          .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
          .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
        this.registrationsLoading = false;
      },
      error: () => { this.registrationsError = 'Unable to load registration requests.'; this.registrationsLoading = false; }
    });
  }

  get filteredRegistrations(): EventInscriptionResponseDTO[] {
    const kw = this.registrationSearch.trim().toLowerCase();
    return this.registrations.filter(r => {
      const matchStatus = this.registrationStatusFilter === 'ALL' || r.status === this.registrationStatusFilter;
      const matchSearch = !kw
        || r.participantNom?.toLowerCase().includes(kw)
        || r.participantPrenom?.toLowerCase().includes(kw)
        || r.eventTitle?.toLowerCase().includes(kw)
        || r.participantRole?.toLowerCase().includes(kw)
        || r.domaine?.toLowerCase().includes(kw);
      return matchStatus && matchSearch;
    });
  }

  get registrationStatusOptions(): string[] { return ['ALL', ...Object.values(InscriptionStatus)]; }
  countByStatus(status: string): number     { return this.registrations.filter(r => r.status === status).length; }
  get pendingCount(): number                { return this.countByStatus(InscriptionStatus.PENDING); }
  get cancelledCount(): number { return this.countByStatus(InscriptionStatus.CANCELLED); } 
  get waitlistCount(): number  { return this.countByStatus(InscriptionStatus.WAITLIST); }
get promotedCount(): number  { return this.countByStatus(InscriptionStatus.PROMOTED); }

  approveRegistration(id: number): void {
    this.registrationActionLoading[id] = true;
    this.inscriptionService.acceptInscription(id).subscribe({
      next: (updated) => {
        const idx = this.registrations.findIndex(r => r.id === id);
        if (idx !== -1) this.registrations[idx] = updated;
        this.registrationActionLoading[id] = false;
        this.loadAllEventsForStats();
      },
      error: () => { this.registrationActionLoading[id] = false; }
    });
  }

  rejectRegistration(id: number): void {
    this.registrationActionLoading[id] = true;
    this.inscriptionService.rejectInscription(id).subscribe({
      next: (updated) => {
        const idx = this.registrations.findIndex(r => r.id === id);
        if (idx !== -1) this.registrations[idx] = updated;
        this.registrationActionLoading[id] = false;
      },
      error: () => { this.registrationActionLoading[id] = false; }
    });
  }

  downloadBadge(reg: EventInscriptionResponseDTO, format: 'png' | 'jpg' | 'pdf' = 'png'): void {
    this.badgeDownloadLoading[reg.id] = true;
    this.badgeGenerator.downloadBadge({
      participantNom:    reg.participantNom,
      participantPrenom: reg.participantPrenom,
      participantRole:   reg.participantRole,
      domaine:           reg.domaine,
      eventTitle:        reg.eventTitle || '',
      location:          this.events.find(e => e.title === reg.eventTitle)?.location || 'Tunis',
      registrationDate:  reg.registrationDate,
      inscriptionId:     reg.id,
      photoBase64:       reg.imageUrl
    }, format).then(() => {
      this.badgeDownloadLoading[reg.id] = false;
    }).catch(() => {
      this.badgeDownloadLoading[reg.id] = false;
    });
  }

  openAcceptEmailModal(reg: EventInscriptionResponseDTO): void {
    this.emailTargetReg = reg; this.emailModalMode = 'accept';
    this.emailRejectionReason = ''; this.emailSuccess = ''; this.emailError = '';
    this.showEmailModal = true;
  }

  openRejectEmailModal(reg: EventInscriptionResponseDTO): void {
    this.emailTargetReg = reg; this.emailModalMode = 'reject';
    this.emailRejectionReason = ''; this.emailSuccess = ''; this.emailError = '';
    this.showEmailModal = true;
  }

  closeEmailModal(): void {
    this.showEmailModal = false; this.emailTargetReg = undefined;
    this.emailSuccess = ''; this.emailError = '';
  }

  async sendEmail(): Promise<void> {
    if (!this.emailTargetReg) return;
    const reg = this.emailTargetReg;
    if (!reg.participantEmail) { this.emailError = 'Adresse email du participant introuvable.'; return; }
    if (this.emailModalMode === 'reject' && !this.emailRejectionReason.trim()) {
      this.emailError = 'Veuillez indiquer la raison du refus.'; return;
    }
    this.emailSending = true; this.emailError = ''; this.emailSuccess = '';
    try {
      if (this.emailModalMode === 'accept') {
        const badgeBase64 = await this.badgeGenerator.generateBadgeAsBase64({
          participantNom: reg.participantNom, participantPrenom: reg.participantPrenom,
          participantRole: reg.participantRole, domaine: reg.domaine,
          eventTitle: reg.eventTitle || '',
          location: this.events.find(e => e.title === reg.eventTitle)?.location || 'Tunis',
          registrationDate: reg.registrationDate, inscriptionId: reg.id, photoBase64: reg.imageUrl
        });
        const badgeUrl = await this.uploadBadgeToImgbb(badgeBase64);
        await emailjs.send(this.EMAILJS_SERVICE_ID, this.EMAILJS_ACCEPT_TEMPLATE_ID, {
          email: reg.participantEmail, to_name: `${reg.participantPrenom} ${reg.participantNom}`,
          event_title: reg.eventTitle || '', badge_image: badgeUrl,
        });
      } else {
        await emailjs.send(this.EMAILJS_SERVICE_ID, this.EMAILJS_REJECT_TEMPLATE_ID, {
          email: reg.participantEmail, to_name: `${reg.participantPrenom} ${reg.participantNom}`,
          event_title: reg.eventTitle || '', rejection_reason: this.emailRejectionReason.trim(),
        });
      }
      this.emailSuccess = this.emailModalMode === 'accept'
        ? '✅ Email d\'acceptation envoyé avec succès !'
        : '✅ Email de refus envoyé avec succès !';
      this.emailSending = false;
      setTimeout(() => this.closeEmailModal(), 2500);
    } catch (err) {
      console.error('EmailJS error:', err);
      this.emailError = 'Erreur lors de l\'envoi. Vérifiez votre configuration EmailJS.';
      this.emailSending = false;
    }
  }

  private async uploadBadgeToImgbb(base64: string): Promise<string> {
    const IMGBB_API_KEY = '3d35536942f1dabba8203ab9a5e544f4';
    const pureBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', pureBase64);
    const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
    const data = await response.json();
    if (!data.success) throw new Error('imgbb upload failed');
    return data.data.url;
  }

  getRegistrationStatusColor(status: string): string {
    const map: { [k: string]: string } = {
      [InscriptionStatus.PENDING]: '#f59e0b', [InscriptionStatus.ACCEPTED]: '#10b981', [InscriptionStatus.REJECTED]: '#ef4444', [InscriptionStatus.CANCELLED]: '#64748b', [InscriptionStatus.WAITLIST]:  '#3b82f6',   // ← bleu
    [InscriptionStatus.PROMOTED]:  '#8b5cf6',
    };
    return map[status] || '#6b7280';
  }

  getRegistrationStatusIcon(status: string): string {
    const map: { [k: string]: string } = {
      [InscriptionStatus.PENDING]: '⏳', [InscriptionStatus.ACCEPTED]: '✅', [InscriptionStatus.REJECTED]: '❌',  [InscriptionStatus.CANCELLED]: '🚫',     [InscriptionStatus.WAITLIST]:  '🕐',        // ← nouveau
    [InscriptionStatus.PROMOTED]:  '🚀', 
    };
    return map[status] || '❓';
  }

  getEventCountByStatus(s: string): number { return this.events.filter(e => e.eventStatus === s).length; }

  getCapacityPercent(event: Event): number {
    if (!event.capacity) return 0;
    return Math.round(((event.currentParticipants || 0) / event.capacity) * 100);
  }
  isEventAlmostFull(event: Event): boolean { return this.getCapacityPercent(event) >= 80; }

  getCardGradient(category: string): string {
    const g: { [k: string]: string } = {
      'CONFERENCE':'linear-gradient(135deg,#1a0533,#2d1052,#4a1a7a)',
      'WORKSHOP':'linear-gradient(135deg,#0a1628,#1b3a5c,#0f4c81)',
      'NETWORKING':'linear-gradient(135deg,#0d2818,#1a4731,#0f7040)',
      'HACKATHON':'linear-gradient(135deg,#1a0a2e,#2d1b5c,#4a2880)',
      'SEMINAR':'linear-gradient(135deg,#1a1000,#3d2800,#6b4400)',
      'TRAINING':'linear-gradient(135deg,#0d1f3c,#1a3a6b,#1e4d8c)',
      'TRADE_SHOW':'linear-gradient(135deg,#1a0a0a,#3d1515,#6b2020)',
      'COMPETITION':'linear-gradient(135deg,#0a1a0a,#1a3d1a,#1f5c1f)',
      'BUSINESS_MEETING':'linear-gradient(135deg,#111,#2a2a2a,#3d3d3d)',
    };
    return g[category] || 'linear-gradient(135deg,#1e293b,#0f172a)';
  }

  getCapacityBarColor(p: number): string {
    if (p >= 90) return 'linear-gradient(90deg,#ef4444,#dc2626)';
    if (p >= 70) return 'linear-gradient(90deg,#f59e0b,#d97706)';
    return 'linear-gradient(90deg,#a855f7,#7c3aed)';
  }

  getCategoryIcon(c: string): string {
    const i: { [k: string]: string } = {
      'CONFERENCE':'🎤','WORKSHOP':'🔧','NETWORKING':'🤝','HACKATHON':'💻',
      'SEMINAR':'📚','TRAINING':'🏋️','TRADE_SHOW':'🏪','COMPETITION':'🏆','BUSINESS_MEETING':'💼'
    };
    return i[c] || '📅';
  }

  getStatusColor(s: string): string {
    const c: { [k: string]: string } = {
      'PUBLISHED':'#10b981','PENDING':'#f59e0b','CANCELLED':'#ef4444','COMPLETED':'#6366f1'
    };
    return c[s] || '#6b7280';
  }

  onFileSelected(event: any): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.processFile(input.files[0]);
  }
  onDragOver(e: DragEvent): void  { e.preventDefault(); e.stopPropagation(); this.isDragging = true; }
  onDragLeave(e: DragEvent): void { e.preventDefault(); e.stopPropagation(); this.isDragging = false; }
  onDrop(e: DragEvent): void {
    e.preventDefault(); e.stopPropagation(); this.isDragging = false;
    if (e.dataTransfer?.files?.[0]) this.processFile(e.dataTransfer.files[0]);
  }

  private processFile(file: File): void {
    if (!file.type.startsWith('image/')) { this.formError = 'Image invalide.'; return; }
    if (file.size > 5 * 1024 * 1024)    { this.formError = 'Image trop lourde (max 5 Mo).'; return; }
    this.selectedFile = file; this.formError = '';
    const img = new Image(); const reader = new FileReader();
    reader.onload = (ev: any) => {
      img.src = ev.target.result;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > 1200 || h > 900) { const s = Math.min(1200/w, 900/h); w = Math.round(w*s); h = Math.round(h*s); }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        let compressed = '';
        for (const q of [0.85, 0.75, 0.65, 0.55]) {
          compressed = canvas.toDataURL('image/jpeg', q);
          if (Math.round((compressed.length * 3) / 4 / 1024) <= 700) break;
        }
        const kb = Math.round((compressed.length * 3) / 4 / 1024);
        if (kb > 700) { this.formError = `Image trop lourde (${kb} KB).`; this.selectedFile = null; return; }
        this.imagePreview = compressed;
        this.eventForm.patchValue({ imageUrl: compressed });
      };
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void      { this.selectedFile = null; this.imagePreview = null; this.eventForm.patchValue({ imageUrl: '' }); }
  triggerFileInput(): void { document.getElementById('modalImageInput')?.click(); }

  initForm(): void {
    this.submitted = false;
    this.eventForm = this.fb.group({
      title:       ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120), noEdgeSpacesValidator, alphanumericValidator]],
      description: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(2000), alphanumericValidator]],
      startDate:   ['', [Validators.required, futureDateValidator]],
      endDate:     ['', [Validators.required]],
      eventStatus: [EventStatus.PENDING, Validators.required],
      category:    [CategoryEvent.CONFERENCE, Validators.required],
      location:    ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150), locationValidator]],
      capacity:    [10, [Validators.required, Validators.min(1), Validators.max(10000), capacityValidator]],
      imageUrl:    [''],
      activities:  this.fb.array([])
    }, { validators: endAfterStartValidator });
  }

  f(name: string): AbstractControl               { return this.eventForm.get(name)!; }
  fieldInvalid(name: string): boolean            { const c = this.f(name); return c.invalid && (c.dirty || c.touched || this.submitted); }
  fieldValid(name: string): boolean              { const c = this.f(name); return c.valid  && (c.dirty || c.touched); }
  fieldError(name: string, err: string): boolean { return this.f(name).hasError(err); }
  charCount(name: string): number                { return (this.f(name).value || '').length; }
  get dateRangeInvalid(): boolean { return this.eventForm.hasError('endBeforeStart') && (this.submitted || this.f('endDate').touched); }

  get activities(): FormArray                         { return this.eventForm.get('activities') as FormArray; }
  getActivityGroup(i: number): FormGroup              { return this.activities.at(i) as FormGroup; }
  actField(i: number, n: string): AbstractControl     { return this.getActivityGroup(i).get(n)!; }
  actFieldInvalid(i: number, n: string): boolean      { const c = this.actField(i, n); return c.invalid && (c.dirty || c.touched || this.submitted); }
  actFieldValid(i: number, n: string): boolean        { const c = this.actField(i, n); return c.valid && !!c.value && (c.dirty || c.touched); }
  actCharCount(i: number, n: string): number          { return (this.actField(i, n).value || '').length; }

  createActivityGroup(): FormGroup {
    return this.fb.group({
      idActivity:   [null],
      name:         ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), noEdgeSpacesValidator, nameOnlyValidator]],
      description:  ['', [Validators.minLength(50), Validators.maxLength(500), alphanumericValidator]],
      requirements: ['', [Validators.minLength(10), Validators.maxLength(300), alphanumericValidator]]
    });
  }
  addActivity(): void             { this.activities.push(this.createActivityGroup()); }
  removeActivity(i: number): void { this.activities.removeAt(i); }

  openCreateModal(): void {
    this.isEditMode = false; this.editEventId = undefined;
    this.formSuccess = ''; this.formError = '';
    this.selectedFile = null; this.imagePreview = null;
    this.initForm(); this.showModal = true;
  }

  openEditModal(event: Event): void {
  this.isEditMode   = true;
  this.editEventId  = event.idEvent;
  this.formSuccess  = '';
  this.formError    = '';
  this.selectedFile = null;
  this.imagePreview = event.imageUrl || null;
  this.initForm();

  // Patch les champs de l'event
  this.eventForm.patchValue({
    title:       event.title,
    description: event.description,
    startDate:   event.startDate ? (event.startDate as string).substring(0, 16) : '',
    endDate:     event.endDate   ? (event.endDate   as string).substring(0, 16) : '',
    eventStatus: event.eventStatus,
    location:    event.location,
    capacity:    event.capacity,
    imageUrl:    event.imageUrl || '',
    category:    event.category
  });

  // Charge les activités depuis activity-service
  this.activityService.getActivitiesByEvent(event.idEvent!).subscribe({
    next: (activities) => {
      this.activities.clear();
      activities.forEach(act => {
        const g = this.createActivityGroup();
        g.patchValue(act);
        this.activities.push(g);
      });
      this.showModal = true;   // ← ouvre le modal seulement après que les activités sont chargées
    },
    error: () => {
      this.showModal = true;   // ouvre quand même même si activités vides
    }
  });
}

  closeModal(): void {
    this.showModal = false; this.submitted = false;
    this.selectedFile = null; this.imagePreview = null;
  }

  onSubmit(): void {
    this.submitted = true; this.formSuccess = ''; this.formError = '';
    this.eventForm.markAllAsTouched();
    if (this.eventForm.invalid) { this.formError = 'Veuillez corriger les erreurs avant de sauvegarder.'; return; }
    this.formLoading = true;
    const userId = this.authService.getCurrentUserId();
    if (!userId) { this.formError = 'Vous devez être connecté.'; this.formLoading = false; return; }
    const payload = { ...this.eventForm.value, userId };
    if (this.isEditMode && this.editEventId) {
      this.eventService.updateEvent(this.editEventId, payload).subscribe({
        next: () => {
          this.formSuccess = 'Événement mis à jour avec succès !'; this.formLoading = false;
          this.loadAllEventsForStats(); this.loadFilteredEvents();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: () => { this.formError = 'Erreur lors de la mise à jour.'; this.formLoading = false; }
      });
    } else {
      this.eventService.createEvent(payload).subscribe({
        next: () => {
          this.formSuccess = 'Événement créé avec succès !'; this.formLoading = false;
          this.loadAllEventsForStats(); this.loadFilteredEvents();
          setTimeout(() => this.closeModal(), 1500);
        },
        error: () => { this.formError = 'Erreur lors de la création.'; this.formLoading = false; }
      });
    }
  }

  generateEventDescription(): void {
    const title = this.f('title').value?.trim();
    if (!title || title.length < 5) { this.formError = 'Veuillez d\'abord entrer un titre (minimum 5 caractères).'; return; }
    this.aiDescLoading = true; this.formError = '';
    this.groqService.generateEventDescription(title).subscribe({
      next: (description) => { this.eventForm.patchValue({ description }); this.aiDescLoading = false; },
      error: () => { this.formError = 'Erreur lors de la génération de la description.'; this.aiDescLoading = false; }
    });
  }

  generateActivityContent(index: number): void {
    const name = this.actField(index, 'name').value?.trim();
    if (!name || name.length < 3) { this.formError = 'Veuillez d\'abord entrer un nom d\'activité (minimum 3 caractères).'; return; }
    this.aiActivityLoading[index] = true; this.formError = '';
    this.groqService.generateActivityDescription(name).subscribe({
      next: (result) => {
        this.getActivityGroup(index).patchValue({ description: result.description, requirements: result.requirements });
        this.aiActivityLoading[index] = false;
      },
      error: () => { this.formError = 'Erreur lors de la génération du contenu de l\'activité.'; this.aiActivityLoading[index] = false; }
    });
  }

  generateEventWithActivities(): void {
    const title = this.f('title').value?.trim();
    if (!title || title.length < 5) { this.formError = 'Veuillez d\'abord entrer un titre (minimum 5 caractères).'; return; }
    this.aiDescLoading = true; this.formError = '';
    this.groqService.generateEventDescription(title).subscribe({
      next: (description) => {
        this.eventForm.patchValue({ description });
        this.groqService.generateEventActivities(title).subscribe({
          next: (activities) => {
            while (this.activities.length) { this.activities.removeAt(0); }
            activities.forEach(act => {
              const g = this.createActivityGroup();
              g.patchValue({ name: act.name, description: act.description, requirements: act.requirements });
              this.activities.push(g);
            });
            this.aiDescLoading = false;
          },
          error: () => { this.formError = 'Erreur lors de la génération des activités.'; this.aiDescLoading = false; }
        });
      },
      error: () => { this.formError = 'Erreur lors de la génération de la description.'; this.aiDescLoading = false; }
    });
  }


  async autoEvaluateAllPending(): Promise<void> {
  const pending = this.registrations.filter(r => r.status === 'PENDING');
  if (pending.length === 0) return;

  this.autoEvaluateLoading   = true;
  this.autoEvaluateProgress  = { current: 0, total: pending.length };
  this.aiEvaluationReasons   = {};

  for (const reg of pending) {
    // Find matching event
    const matchedEvent = this.events.find(e => e.title === reg.eventTitle);
    if (!matchedEvent) {
      this.autoEvaluateProgress.current++;
      continue;
    }

    try {
      // Fetch full activities if not loaded
      const activities = matchedEvent.activities?.length
        ? matchedEvent.activities
        : await this.activityService.getActivitiesByEvent(matchedEvent.idEvent!).toPromise().catch(() => []);

      const result = await this.groqService.evaluateInscription(
        {
          title:               matchedEvent.title,
          description:         matchedEvent.description,
          activities:          activities || [],
          capacity:            matchedEvent.capacity,
          currentParticipants: matchedEvent.currentParticipants || 0
        },
        {
          participantNom:    reg.participantNom,
          participantPrenom: reg.participantPrenom,
          participantRole:   reg.participantRole,
          domaine:           reg.domaine,
          message:           reg.message
        }
      ).toPromise();

      if (result) {
        // Store reason for display
        this.aiEvaluationReasons[reg.id] = result;

        // Apply decision
        if (result.decision === 'ACCEPT') {
          await this.inscriptionService.acceptInscription(reg.id).toPromise();
          const idx = this.registrations.findIndex(r => r.id === reg.id);
          if (idx !== -1) this.registrations[idx].status = InscriptionStatus.ACCEPTED;
        } else {
          await this.inscriptionService.rejectInscription(reg.id).toPromise();
          const idx = this.registrations.findIndex(r => r.id === reg.id);
         if (idx !== -1) this.registrations[idx].status = InscriptionStatus.REJECTED;
        }
      }
    } catch (err) {
      console.error('AI evaluation error for inscription', reg.id, err);
    }

    this.autoEvaluateProgress.current++;
  }

  this.autoEvaluateLoading = false;
  this.loadAllEventsForStats();
}

openCapacityModal(event: Event): void {
  this.capacityModalEvent = event;
  this.newCapacityValue   = event.capacity ?? null;
  this.capacityStatus     = null;
  this.showCapacityModal  = true;
  this.capacityLoading    = true;

  this.inscriptionService.getCapacityStatus(event.idEvent!).subscribe({
    next: (s) => { this.capacityStatus = s; this.capacityLoading = false; },
    error: ()  => { this.capacityLoading = false; }
  });
}

closeCapacityModal(): void {
  this.showCapacityModal  = false;
  this.capacityModalEvent = undefined;
  this.newCapacityValue   = null;
}

confirmCapacityIncrease(): void {
  if (!this.capacityModalEvent?.idEvent || !this.newCapacityValue) return;
  const current = this.capacityModalEvent.capacity ?? 0;
  if (this.newCapacityValue <= current) return;

  this.capacityLoading = true;
  this.inscriptionService.increaseCapacity(
    this.capacityModalEvent.idEvent,
    this.newCapacityValue
  ).subscribe({
    next: (updatedStatus) => {
      this.capacityStatus  = updatedStatus;
      this.capacityLoading = false;
      this.loadAllEventsForStats();
      this.loadFilteredEvents();
      // Recharge les inscriptions si le modal est ouvert
      if (this.showRegistrationsModal) this.loadAllRegistrations();
      setTimeout(() => this.closeCapacityModal(), 1500);
    },
    error: () => { this.capacityLoading = false; }
  });
}

getWaitlistPosition(reg: EventInscriptionResponseDTO): number {
  const waitlist = this.registrations
    .filter(r => r.eventId === reg.eventId && r.status === InscriptionStatus.WAITLIST)
    .sort((a, b) => new Date(a.waitlistDate!).getTime() - new Date(b.waitlistDate!).getTime());
  return waitlist.findIndex(r => r.id === reg.id) + 1;
}

getPromotionCount(newCap: number, status: any): number {
  if (!status) return 0;
  return Math.min(newCap - status.capacity, status.waitlistSize);
}

// reporting section

openReportModal(): void {
  this.showReportModal = true;
  this.reportGenerated = false;
  this.reportLoading   = true;
  this.reportAIText    = '';

  // Si les inscriptions sont déjà chargées, générer directement
  if (this.registrations.length > 0) {
    this.generateAIReport();
    return;
  }

  // Sinon, charger d'abord toutes les inscriptions
  const eventIds = this.events.map(e => e.idEvent).filter((id): id is number => id != null);
  if (eventIds.length === 0) {
    this.reportLoading = false;
    this.reportGenerated = true;
    this.reportAIText = 'No events found to analyze.';
    return;
  }

  const requests = eventIds.map(id =>
    this.inscriptionService.getInscriptionsByEvent(id).pipe(catchError(() => of([] as EventInscriptionResponseDTO[])))
  );

  forkJoin(requests).subscribe({
    next: (results) => {
      const all = ([] as EventInscriptionResponseDTO[]).concat(...results);
      const seen = new Set<number>();
      this.registrations = all.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      this.generateAIReport(); // ← seulement après que les données sont prêtes
    },
    error: () => {
      this.reportLoading   = false;
      this.reportGenerated = true;
      this.reportAIText    = 'Failed to load registration data.';
    }
  });
}

closeReportModal(): void {
  this.showReportModal = false;
}

get reportAccepted(): number {
  return this.registrations.filter(r => r.status === InscriptionStatus.ACCEPTED || r.status === InscriptionStatus.PROMOTED).length;
}
get reportRejected(): number {
  return this.registrations.filter(r => r.status === InscriptionStatus.REJECTED).length;
}
get reportAcceptRate(): number {
  const t = this.reportAccepted + this.reportRejected;
  return t ? Math.round(this.reportAccepted / t * 100) : 0;
}

get reportByEvent(): { title: string; accepted: number; rejected: number; pending: number; rate: number }[] {
  return this.events.map(event => {
    const evtRegs = this.registrations.filter(r => r.eventTitle === event.title);
    const accepted = evtRegs.filter(r => r.status === InscriptionStatus.ACCEPTED || r.status === InscriptionStatus.PROMOTED).length;
    const rejected = evtRegs.filter(r => r.status === InscriptionStatus.REJECTED).length;
    const pending  = evtRegs.filter(r => r.status === InscriptionStatus.PENDING).length;
    const total    = accepted + rejected;
    return { title: event.title, accepted, rejected, pending, rate: total ? Math.round(accepted / total * 100) : 0 };
  }).filter(e => e.accepted + e.rejected + e.pending > 0);
}

get reportRoleStats(): { role: string; count: number; pct: number }[] {
  const map: Record<string, number> = {};
  this.registrations.forEach(r => {
    if (r.participantRole) map[r.participantRole] = (map[r.participantRole] || 0) + 1;
  });
  const total = this.registrations.length || 1;
  return Object.entries(map).sort((a, b) => b[1] - a[1])
    .map(([role, count]) => ({ role, count, pct: Math.round(count / total * 100) }));
}

get reportDomainStats(): { domain: string; count: number; pct: number }[] {
  const map: Record<string, number> = {};
  this.registrations.forEach(r => {
    if (r.domaine) map[r.domaine] = (map[r.domaine] || 0) + 1;
  });
  const total = this.registrations.length || 1;
  return Object.entries(map).sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => ({ domain, count, pct: Math.round(count / total * 100) }));
}

generateAIReport(): void {
  const summary = {
    totalRegistrations: this.registrations.length,
    accepted:           this.reportAccepted,
    rejected:           this.reportRejected,
    pending:            this.countByStatus(InscriptionStatus.PENDING),
    acceptRate:         this.reportAcceptRate,
    topRole:            this.reportRoleStats[0],
    topDomain:          this.reportDomainStats[0],
    bestEvent:          [...this.reportByEvent].sort((a, b) => b.rate - a.rate)[0],
    worstEvent:         [...this.reportByEvent].sort((a, b) => a.rate - b.rate)[0],
    byEvent:            this.reportByEvent,
    roleStats:          this.reportRoleStats,
    domainStats:        this.reportDomainStats,
  };

  const prompt = `You are an event analytics expert. Based on this participant registration data, write a professional report in English with 4-5 paragraphs covering: overall acceptance trends, participant profile (roles and domains), per-event performance highlights, anomalies or recommendations for improvement.

DATA:
- Total registrations: ${summary.totalRegistrations}
- Accepted: ${summary.accepted}, Rejected: ${summary.rejected}, Pending: ${summary.pending}
- Overall acceptance rate: ${summary.acceptRate}%
- Top role: ${summary.topRole?.role} (${summary.topRole?.count} registrations, ${summary.topRole?.pct}%)
- Top domain: ${summary.topDomain?.domain} (${summary.topDomain?.count} registrations, ${summary.topDomain?.pct}%)
- Best performing event: "${summary.bestEvent?.title}" with ${summary.bestEvent?.rate}% acceptance rate
- Lowest performing event: "${summary.worstEvent?.title}" with ${summary.worstEvent?.rate}% acceptance rate
- Per-event details: ${summary.byEvent.map(e => `${e.title}: ${e.accepted} accepted, ${e.rejected} rejected, ${e.rate}% rate`).join(' | ')}
- Roles: ${summary.roleStats.map(r => `${r.role}: ${r.count} (${r.pct}%)`).join(', ')}
- Domains: ${summary.domainStats.map(d => `${d.domain}: ${d.count} (${d.pct}%)`).join(', ')}

Write ONLY the report text, no headers, no bullet points. Paragraphs separated by double newlines.`;

  this.groqService.generateRawText(prompt).subscribe({
    next: (text) => {
      this.reportAIText    = text;
      this.reportLoading   = false;
      this.reportGenerated = true;
    },
    error: () => {
      this.reportAIText    = 'AI analysis unavailable. Please check your Groq configuration.';
      this.reportLoading   = false;
      this.reportGenerated = true;
    }
  });
}

get reportSchedule(): {
  title: string;
  category: string;
  status: string;
  location: string;
  startDate: Date | null;
  endDate: Date | null;
  durationDays: number;
  capacity: number;
  participants: number;
  fillRate: number;
}[] {
  return this.events
    .filter(e => e.startDate && e.endDate)
    .map(e => {
      const start       = new Date(e.startDate as string);
      const end         = new Date(e.endDate   as string);
      const durationMs  = end.getTime() - start.getTime();
      const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));
      const participants = e.currentParticipants || 0;
      const capacity     = e.capacity || 1;
      return {
        title:        e.title,
        category:     e.category,
        status:       e.eventStatus,
        location:     e.location || '—',
        startDate:    start,
        endDate:      end,
        durationDays,
        capacity,
        participants,
        fillRate: Math.round((participants / capacity) * 100),
      };
    })
    .sort((a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0));
}

formatScheduleDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

getScheduleBarStyle(event: {
  startDate: Date | null;
  endDate:   Date | null;
  status:    string;
}): { left: string; width: string; background: string } {
  if (!this.reportSchedule.length) return { left: '0%', width: '5%', background: '#6b7280' };

  const dates  = this.reportSchedule.filter(e => e.startDate && e.endDate);
  const minTs  = Math.min(...dates.map(e => e.startDate!.getTime()));
  const maxTs  = Math.max(...dates.map(e => e.endDate!.getTime()));
  const total  = maxTs - minTs || 1;

  const left  = ((( event.startDate?.getTime() ?? minTs) - minTs) / total) * 100;
  const width = Math.max(2, (((event.endDate?.getTime()  ?? minTs) - (event.startDate?.getTime() ?? minTs)) / total) * 100);

  const colors: Record<string, string> = {
    PUBLISHED: 'linear-gradient(90deg,#10b981,#059669)',
    PENDING:   'linear-gradient(90deg,#f59e0b,#d97706)',
    CANCELLED: 'linear-gradient(90deg,#ef4444,#dc2626)',
    COMPLETED: 'linear-gradient(90deg,#6366f1,#4f46e5)',
  };

  return {
    left:       `${left.toFixed(1)}%`,
    width:      `${width.toFixed(1)}%`,
    background: colors[event.status] || 'linear-gradient(90deg,#6b7280,#4b5563)',
  };
}

getScheduleTimelineMonths(): string[] {
  if (!this.reportSchedule.length) return [];
  const dates = this.reportSchedule.filter(e => e.startDate && e.endDate);
  if (!dates.length) return [];
  const minTs = Math.min(...dates.map(e => e.startDate!.getTime()));
  const maxTs = Math.max(...dates.map(e => e.endDate!.getTime()));
  const months: string[] = [];
  const cur = new Date(minTs);
  cur.setDate(1);
  while (cur.getTime() <= maxTs) {
    months.push(cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

async downloadReportPdf(): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');
  const el = document.getElementById('reportPrintArea') as HTMLElement;

  // Sauvegarde les styles originaux
  const originalOverflow  = el.style.overflow;
  const originalMaxHeight = el.style.maxHeight;
  const originalHeight    = el.style.height;
  const originalWidth     = el.style.width;

  // Force l'élément à afficher tout son contenu sans scroll
  el.style.overflow  = 'visible';
  el.style.maxHeight = 'none';
  el.style.height    = 'auto';
  el.style.width     = '900px';

  await new Promise(resolve => setTimeout(resolve, 200));

  const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfW = pdf.internal.pageSize.getWidth();   // 210mm
  const pdfH = pdf.internal.pageSize.getHeight();  // 297mm
  const margin    = 12; // mm
  const contentW  = pdfW - margin * 2;
  const contentH  = pdfH - margin * 2;

  // Récupère tous les blocs enfants directs pour éviter les coupures
  const children = Array.from(el.children) as HTMLElement[];

  let currentY = margin; // position Y courante sur la page PDF (en mm)
  let pageIndex = 0;

  for (const child of children) {
    const canvas = await html2canvas(child as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width:  (child as HTMLElement).scrollWidth,
      height: (child as HTMLElement).scrollHeight,
    });

    const imgData  = canvas.toDataURL('image/jpeg', 0.92);
    const ratio    = contentW / canvas.width;         // px → mm
    const blockH   = canvas.height * ratio;           // hauteur du bloc en mm

    // Si le bloc ne rentre pas sur la page courante → nouvelle page
    if (currentY + blockH > pdfH - margin && currentY > margin) {
      pdf.addPage();
      pageIndex++;
      currentY = margin;
    }

    // Si le bloc est plus grand qu'une page entière, on le coupe proprement
    if (blockH > contentH) {
      let srcY = 0; // en pixels dans le canvas
      while (srcY < canvas.height) {
        const sliceHeightPx = Math.floor(contentH / ratio); // hauteur d'une page en px
        const sliceCanvas   = document.createElement('canvas');
        sliceCanvas.width   = canvas.width;
        sliceCanvas.height  = Math.min(sliceHeightPx, canvas.height - srcY);
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, sliceCanvas.width, sliceCanvas.height, 0, 0, sliceCanvas.width, sliceCanvas.height);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        const sliceH    = sliceCanvas.height * ratio;
        if (srcY > 0) { pdf.addPage(); currentY = margin; }
        pdf.addImage(sliceData, 'JPEG', margin, currentY, contentW, sliceH);
        currentY += sliceH + 4;
        srcY     += sliceHeightPx;
      }
    } else {
      pdf.addImage(imgData, 'JPEG', margin, currentY, contentW, blockH);
      currentY += blockH + 4; // 4mm de spacing entre blocs
    }
  }

  // Restaure les styles originaux
  el.style.overflow  = originalOverflow;
  el.style.maxHeight = originalMaxHeight;
  el.style.height    = originalHeight;
  el.style.width     = originalWidth;

  pdf.save(`participant-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}







}