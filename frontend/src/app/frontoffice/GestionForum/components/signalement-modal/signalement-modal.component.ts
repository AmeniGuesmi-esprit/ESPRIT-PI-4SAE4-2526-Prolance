import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Publication } from '../../models/publication.model';
import { PublicationService } from '../../services/publication.service';

@Component({
  selector: 'app-signalement-modal',
  templateUrl: './signalement-modal.component.html',
  styleUrls: ['./signalement-modal.component.css']
})
export class SignalementModalComponent implements OnInit {

  @Input() publicationId!: number;
  @Input() pubTitre: string = '';
  @Input() currentUserId!: number;
  @Input() alreadyReportedByUser: boolean = false; // ✅ reçu du parent

  @Output() reported        = new EventEmitter<Publication>();
  @Output() cancelled       = new EventEmitter<void>();
  @Output() alreadyReported = new EventEmitter<void>();

  readonly presetReasons: string[] = [
    '🤬 Hate speech or harassment',
    '📵 Inappropriate or offensive content',
    '🛑 Spam or advertising',
    '❌ False or misleading information',
    '⚠️ Violence or dangerous content',
    '🔞 Adult or explicit content',
  ];

  selectedReason: string = '';
  customReason: string   = '';
  showError: boolean     = false;
  loading: boolean       = false;

  constructor(private publicationService: PublicationService) {}

  ngOnInit(): void {
    // ✅ Si l'user a déjà signalé, on émet l'event directement sans ouvrir
    if (this.alreadyReportedByUser) {
      this.alreadyReported.emit();
    }
  }

  selectReason(reason: string): void {
    this.selectedReason = this.selectedReason === reason ? '' : reason;
    this.showError = false;
  }

  onCustomInput(): void {
    if (this.customReason.trim()) {
      this.selectedReason = '';
    }
    this.showError = false;
  }

  getFinalReason(): string {
    if (this.customReason.trim()) return this.customReason.trim();
    return this.selectedReason;
  }

  onSubmit(): void {
    const finalReason = this.getFinalReason();
    if (!finalReason) {
      this.showError = true;
      return;
    }

    this.loading = true;

    // ✅ L'appel API se fait UNIQUEMENT ici, au clic sur Submit
    this.publicationService.signalerPublication(
      this.publicationId,
      this.currentUserId,
      finalReason
    ).subscribe({
      next: (updatedPub: Publication) => {
        this.loading = false;
        this.reported.emit(updatedPub); // ✅ retourne la pub mise à jour
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 409) {
          // ✅ Déjà signalé → on notifie le parent
          this.alreadyReported.emit();
        } else {
          console.error('Report error', err);
          this.showError = true;
        }
      }
    });
  }

  onCancel(): void {
    if (!this.loading) this.cancelled.emit();
  }
}