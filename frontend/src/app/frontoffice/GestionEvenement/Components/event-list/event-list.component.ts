import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Event } from '../../models/event.model';
import { EventService } from '../../services/event.service';
import { ActivityService } from '../../services/activity.service';          // ← AJOUTÉ
import { AuthService } from '../../../../services/auth.services';
import { CategoryEvent, EventStatus } from '../../models/event.model';
import { InscriptionService } from '../../services/inscription.service';
import { EventInscriptionRequestDTO, EventInscriptionResponseDTO } from '../../models/inscription.model';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.css']
})
export class EventListComponent implements OnInit {

  events:         Event[] = [];
  filteredEvents: Event[] = [];
  loading           = false;
  activityLoading   = false;                                                 // ← AJOUTÉ
  errorMsg          = '';
  successMsg        = '';

  searchText     = '';
  filterCategory = '';
  filterStatus   = '';

  selectedEvent:    Event | null = null;
  inscriptionEvent: Event | null = null;
  currentUserId: number = 0;

  userInscriptions: EventInscriptionResponseDTO[] = [];

  eventStatuses = Object.values(EventStatus);
  categories    = Object.values(CategoryEvent);

  constructor(
    private eventService:       EventService,
    private activityService:    ActivityService,                            // ← AJOUTÉ
    private inscriptionService: InscriptionService,
    private router:             Router,
    private authService:        AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = (this.authService.getCurrentUser() as any)?.userId
                      ?? (this.authService.getCurrentUser() as any)?.id
                      ?? 0;
    this.loadEvents();
    this.loadUserInscriptions();
  }

  loadUserInscriptions(): void {
    if (!this.currentUserId) return;
    this.inscriptionService.getMesInscriptions(this.currentUserId).subscribe({
      next: (data) => { this.userInscriptions = data; },
      error: () => {}
    });
  }

  loadEvents(): void {
    this.loading = true;
    this.eventService.getAllEvents().subscribe({
      next: (data) => {
        this.events         = data;
        this.filteredEvents = data;
        this.loading        = false;
        this.applyFilters();
      },
      error: () => {
        this.errorMsg = 'Erreur lors du chargement des evenements.';
        this.loading  = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredEvents = this.events.filter(e => {
      const matchSearch =
        !this.searchText ||
        e.title?.toLowerCase().includes(this.searchText.toLowerCase()) ||
        e.location?.toLowerCase().includes(this.searchText.toLowerCase());
      const matchCat    = !this.filterCategory || e.category    === this.filterCategory;
      const matchStatus = !this.filterStatus   || e.eventStatus === this.filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }

  resetFilters(): void {
    this.searchText     = '';
    this.filterCategory = '';
    this.filterStatus   = '';
    this.filteredEvents = [...this.events];
  }

  participerEvent(event: Event): void {
    this.selectedEvent    = null;
    this.inscriptionEvent = event;
  }

  closeInscriptionModal(): void {
    this.inscriptionEvent = null;
  }

  onInscriptionSuccess(payload: EventInscriptionRequestDTO): void {
    this.closeInscriptionModal();
    this.successMsg = 'Votre demande d\'inscription a bien été envoyée !';
    this.loadUserInscriptions();
    setTimeout(() => this.successMsg = '', 4000);
  }

  // ── MODIFIÉ : charge les activités depuis activity-service ──────────────
  openModal(event: Event): void {
    this.selectedEvent    = { ...event, activities: [] };
    this.activityLoading  = true;

    this.activityService.getActivitiesByEvent(event.idEvent!).subscribe({
      next: (activities) => {
        this.selectedEvent  = { ...event, activities };
        this.activityLoading = false;
      },
      error: () => {
        this.selectedEvent  = { ...event, activities: [] };
        this.activityLoading = false;
      }
    });
  }
  // ────────────────────────────────────────────────────────────────────────

  closeModal(): void {
    this.selectedEvent = null;
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  getUserInscriptionStatus(eventId: number): string | null {
    const found = this.userInscriptions.find(i => i.eventId === eventId);
    return found ? found.status : null;
  }

  isParticipateDisabled(eventId: number): boolean {
    const status = this.getUserInscriptionStatus(eventId);
    return status === 'PENDING' || status === 'ACCEPTED';
  }

  getParticipateLabel(eventId: number): string {
    const status = this.getUserInscriptionStatus(eventId);
    if (status === 'PENDING')  return '⏳ En attente';
    if (status === 'ACCEPTED') return '✅ Inscrit';
    if (status === 'REJECTED') return '↩ Re-soumettre';
    if (status === 'CANCELLED')  return '↩ Re-s\'inscrire';
    return 'Participer';
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PUBLISHED: 'status-active',
      PENDING:   'status-pending',
      CANCELLED: 'status-cancelled',
      COMPLETED: 'status-completed'
    };
    return map[status] || 'status-pending';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatDateOnly(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }


  canCancelInscription(eventId: number): boolean {
  // Récupérer la startDate depuis la liste events déjà chargée
  const event = this.events.find(e => e.idEvent === eventId);
  if (!event?.startDate) return false;

  const now       = new Date();
  const startDate = new Date(event.startDate);
  const diffMs    = startDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Autorisé seulement si on est à plus de 24h du début
  return diffHours > 24;
}

cancelInscription(eventId: number, event: MouseEvent): void {
  event.stopPropagation(); // éviter d'ouvrir le modal

  const inscription = this.userInscriptions.find(i => i.eventId === eventId);
  if (!inscription) return;

  if (!this.canCancelInscription(eventId)) {
    this.errorMsg = 'Annulation impossible : l\'événement commence dans moins de 24h.';
    setTimeout(() => this.errorMsg = '', 4000);
    return;
  }

  if (!confirm('Confirmer l\'annulation de votre inscription ?')) return;

  this.inscriptionService.cancelInscription(inscription.id).subscribe({
    next: () => {
      this.successMsg = 'Inscription annulée avec succès.';
      this.loadUserInscriptions();
      setTimeout(() => this.successMsg = '', 4000);
    },
    error: (err) => {
      this.errorMsg = err?.error?.message || 'Erreur lors de l\'annulation.';
      setTimeout(() => this.errorMsg = '', 4000);
    }
  });
}
}