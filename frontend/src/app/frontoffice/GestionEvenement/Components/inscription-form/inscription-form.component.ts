import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InscriptionService } from '../../services/inscription.service';
import {
  EventInscriptionRequestDTO,
  EventInscriptionResponseDTO,
  InscriptionStatus,
  ParticipantRole,
  Domaine
} from '../../models/inscription.model';

export { InscriptionStatus, ParticipantRole, Domaine, EventInscriptionRequestDTO, EventInscriptionResponseDTO };

const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-inscription-form',
  templateUrl: './inscription-form.component.html',
  styleUrls: ['./inscription-form.component.css']
})
export class InscriptionFormComponent implements OnInit {

  @Input() eventId!: number;
  @Input() eventTitle: string = '';
  @Input() userId!: number;
  @Input() existingInscriptions: EventInscriptionResponseDTO[] = [];

  @Output() closeModal    = new EventEmitter<void>();
  @Output() formSubmitted = new EventEmitter<EventInscriptionRequestDTO>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  inscriptionForm!: FormGroup;
  isSubmitting  = false;
  submitSuccess = false;
  submitError   = '';

  alreadyRegistered = false;
  existingInscriptionInfo: EventInscriptionResponseDTO | null = null;

  // ✅ NOUVEAU : état "capacité atteinte"
  isEventFull = false;

  conditionsAccepted = false;
  conditionsError    = false;

  selectedPhotoFile: File | null = null;
  photoPreviewUrl:   string | null = null;
  photoSizeError     = false;

  domaines = Object.values(Domaine);
  roles    = Object.values(ParticipantRole);

  domaineLabels: Record<string, string> = { DEVELOPMENT: 'Développement', DESIGN: 'Design' };
  domaineIcons:  Record<string, string> = { DEVELOPMENT: 'code', DESIGN: 'palette' };
  roleLabels:    Record<string, string> = { VISITEUR: 'Visiteur', PARTICIPANT: 'Participant', SPEAKER: 'Speaker', ANIMATOR: 'Animateur', EXPERT: 'Expert' };
  roleIcons:     Record<string, string> = { VISITEUR: 'visibility', PARTICIPANT: 'person', SPEAKER: 'mic', ANIMATOR: 'record_voice_over', EXPERT: 'workspace_premium' };
  statusLabels:  Record<string, string> = { PENDING: 'En attente de validation', ACCEPTED: 'Acceptée', REJECTED: 'Refusée' };
  statusIcons:   Record<string, string> = { PENDING: 'schedule', ACCEPTED: 'check_circle', REJECTED: 'cancel' };

  constructor(private fb: FormBuilder, private inscriptionService: InscriptionService) {}

  ngOnInit(): void {
    this.inscriptionForm = this.fb.group({
      participantNom:    ['', [Validators.required, Validators.minLength(2)]],
      participantPrenom: ['', [Validators.required, Validators.minLength(2)]],
      domaine:           ['', Validators.required],
      participantRole:   ['', Validators.required],
      message:           ['']
    });
    this.checkAlreadyRegistered();
  }

  get f() { return this.inscriptionForm.controls; }

  private checkAlreadyRegistered(): void {
    if (!this.existingInscriptions?.length) return;
    const found = this.existingInscriptions.find(
      insc => insc.userId === this.userId && insc.eventId === this.eventId
    );
    if (found) { this.alreadyRegistered = true; this.existingInscriptionInfo = found; }
  }

  triggerFileInput(): void { this.fileInput.nativeElement.click(); }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    input.value = '';
    if (file.size > MAX_PHOTO_SIZE_BYTES) { this.photoSizeError = true; return; }
    this.photoSizeError = false;
    this.selectedPhotoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.photoPreviewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  removePhoto(): void { this.selectedPhotoFile = null; this.photoPreviewUrl = null; this.photoSizeError = false; }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('insc-overlay')) this.close();
  }

  close(): void { this.closeModal.emit(); }

  toggleConditions(): void {
    this.conditionsAccepted = !this.conditionsAccepted;
    if (this.conditionsAccepted) this.conditionsError = false;
  }

  // ─── REMPLACE toute la méthode onSubmit() ────────────────────────────────────

onSubmit(): void {
  if (this.alreadyRegistered || this.isEventFull) return;
  if (this.inscriptionForm.invalid) { this.inscriptionForm.markAllAsTouched(); return; }
  if (!this.conditionsAccepted)     { this.conditionsError = true; return; }

  this.isSubmitting = true;
  this.submitError  = '';

  // ── Si une photo est sélectionnée, la convertir en base64 puis soumettre ──
  if (this.selectedPhotoFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string; // "data:image/jpeg;base64,..."
      this.submitPayload(base64);
    };
    reader.onerror = () => {
      this.submitError = 'Erreur lors de la lecture de la photo.';
      this.isSubmitting = false;
    };
    reader.readAsDataURL(this.selectedPhotoFile);
  } else {
    this.submitPayload(undefined);
  }
}

// ── Méthode privée qui envoie le payload final ────────────────────────────────
private submitPayload(imageBase64: string | undefined): void {
  const msg = this.inscriptionForm.value.message?.trim();

  const payload: EventInscriptionRequestDTO = {
    participantNom:    this.inscriptionForm.value.participantNom,
    participantPrenom: this.inscriptionForm.value.participantPrenom,
    domaine:           this.inscriptionForm.value.domaine,
    participantRole:   this.inscriptionForm.value.participantRole,
    message:           msg   ? msg   : null,          // ← null explicite si vide
    imageUrl:          imageBase64 ? imageBase64 : null, // ← base64 ou null
    userId:            this.userId,
    eventId:           this.eventId,
  };

  this.inscriptionService.submitInscription(payload).subscribe({
    next: () => {
      this.isSubmitting  = false;
      this.submitSuccess = true;
      this.formSubmitted.emit(payload);
    },
    error: (err) => {
      this.isSubmitting = false;
      const body   = err?.error;
      const msgStr: string =
        typeof body === 'string'
          ? body
          : (body?.message ?? body?.error ?? '');

      if (err.status === 409 || msgStr.includes('déjà')) {
        this.alreadyRegistered = true;
      } else if (msgStr.includes('Maximum number') || msgStr.includes('capacité')) {
        this.isEventFull = true;
      } else {
        this.submitError = msgStr || 'Une erreur est survenue. Veuillez réessayer.';
      }
    }
  });
}

  resetAndClose(): void {
    this.inscriptionForm.reset();
    this.removePhoto();
    this.conditionsAccepted = false;
    this.conditionsError    = false;
    this.submitSuccess      = false;
    this.submitError        = '';
    this.close();
  }
}