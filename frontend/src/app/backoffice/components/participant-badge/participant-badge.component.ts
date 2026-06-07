import {
  Component, Input, OnChanges, SimpleChanges,
  ViewChild, ElementRef, Output, EventEmitter
} from '@angular/core';

export interface BadgeInscription {
  id: number;
  participantNom: string;
  participantPrenom: string;
  participantRole: string;
  domaine?: string;
  imageUrl?: string;
  registrationDate?: string | Date;
  status: string;
  eventTitle?: string;
  eventStartDate?: string | Date;
  eventLocation?: string;
  eventId?: number;
}

@Component({
  selector: 'app-participant-badge',
  standalone: false,
  templateUrl: './participant-badge.component.html',
  styleUrls: ['./participant-badge.component.scss'],
})
export class ParticipantBadgeComponent implements OnChanges {

  @Input() inscription!: BadgeInscription;
  @Input() eventStartDate?: string | Date;
  @Input() eventLocation?: string;
  @Input() appLogoUrl?: string = 'assets/logo.png';
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('badgeCard') badgeCardRef!: ElementRef<HTMLElement>;

  isGenerating = false;
  imgError = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inscription'] && this.inscription) {
      this.imgError = false;
      this.eventStartDate = this.inscription.eventStartDate ?? this.eventStartDate;
      this.eventLocation  = this.inscription.eventLocation  ?? this.eventLocation;
    }
  }

  open(): void  { this.isOpen = true; }
  close(): void { this.isOpen = false; this.closed.emit(); }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('badge-overlay')) {
      this.close();
    }
  }

  async downloadBadge(): Promise<void> {
    if (!this.badgeCardRef) return;
    this.isGenerating = true;
    try {
      const h2c = require('html2canvas');
      const canvas = await h2c(this.badgeCardRef.nativeElement);
      const link = document.createElement('a');
      link.download = `badge_${this.inscription.participantPrenom}_${this.inscription.participantNom}_${this.inscription.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Badge export error:', err);
    } finally {
      this.isGenerating = false;
    }
  }

  printBadge(): void { window.print(); }

  getInitials(): string {
    const p = this.inscription?.participantPrenom?.[0]?.toUpperCase() ?? '';
    const n = this.inscription?.participantNom?.[0]?.toUpperCase() ?? '';
    return p + n;
  }

  getRoleIcon(): string {
    const icons: Record<string, string> = {
      SPEAKER: '🎤', ANIMATOR: '🎬', PARTICIPANT: '🎫',
      ORGANIZER: '🗂️', VOLUNTEER: '🤝', VIP: '⭐',
      JUDGE: '⚖️', MENTOR: '🧭',
    };
    return icons[(this.inscription?.participantRole ?? '').toUpperCase()] ?? '🎫';
  }

  formatDate(date?: string | Date | null): string {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  onImgError(): void { this.imgError = true; }

  get showPhoto(): boolean {
    return !!this.inscription?.imageUrl && !this.imgError;
  }
}