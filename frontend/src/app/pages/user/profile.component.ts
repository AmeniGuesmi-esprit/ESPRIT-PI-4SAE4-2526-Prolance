import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil, finalize } from 'rxjs';
import { AuthService, SessionUser } from '../../services/auth.services';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { FaceAuthService } from '../../services/face-auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  @ViewChild('faceVideo') faceVideoRef!: ElementRef<HTMLVideoElement>;

  private destroy$ = new Subject<void>();
  private readonly API = 'http://localhost:8222';

  currentUser: SessionUser | null = null;
  userProfile: any = null;
  isEditMode  = false;
  isLoading   = false;
  loadError: string | null = null;

  profileForm:  FormGroup;
  passwordForm: FormGroup;
  showPasswordChange = false;

  // Avatar
  avatarPreview    : string | null = null;
  isUploadingAvatar = false;

  // Delete modal
  showDeleteModal = false;

  // ── AI Avatar Generator ──────────────────────────────────────────────
  showAiAvatarModal   = false;
  isGenerating        = false;
  aiPromptText        = '';
  generatedImages: string[] = [];
  loadedImages        = new Set<string>();
  imageStates: Record<string, 'loading' | 'loaded' | 'error'> = {};
  selectedGeneratedImage: string | null = null;
  selectedStyle       = 'professional';

  avatarStyles = [
    { label: 'Professional', value: 'professional', emoji: '💼' },
    { label: 'Artistic',     value: 'artistic',     emoji: '🎨' },
    { label: 'Cartoon',      value: 'cartoon',      emoji: '🎭' },
    { label: 'Minimalist',   value: 'minimalist',   emoji: '⬜' },
    { label: 'Cyberpunk',    value: 'cyberpunk',    emoji: '🤖' },
    { label: 'Fantasy',      value: 'fantasy',      emoji: '✨' },
  ];

  // ── AI Bio Generator ─────────────────────────────────────────────────
  generatedBio    = '';
  isGeneratingBio = false;
  bioTone         = 'professional';
  bioExtra        = '';
  showBioPanel    = false;
  bioSaved        = false;

  bioTones = [
    { label: '💼 Professional', value: 'professional' },
    { label: '🎨 Creative',     value: 'creative'     },
    { label: '😊 Casual',       value: 'casual'       },
  ];

  // ── Face ID Setup ────────────────────────────────────────────────────
  showFaceSetupPanel  = false;
  faceStatus          = '';
  faceStatusType: 'idle' | 'working' | 'ok' | 'fail' = 'idle';
  faceRingState       = '';
  enrollProgress      = 0;
  isFaceWorking       = false;
  private faceAbort   = false;

  get hasFaceEnrolled(): boolean { return this.faceAuthService.hasEnrollment(); }

  private get faceVideo(): HTMLVideoElement {
    return this.faceVideoRef?.nativeElement;
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private faceAuthService: FaceAuthService,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {
    this.profileForm = this.fb.group({
      name:      ['', [Validators.required, Validators.minLength(2)]],
      lastName:  ['', [Validators.required, Validators.minLength(2)]],
      email:     ['', [Validators.required, Validators.email]],
      birthDate: [''],
      bio:       ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.isLoading = true;
    const storedUser = localStorage.getItem('sessionUser');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.loadUserProfile();
      } catch (e) {
        this.router.navigate(['/login']);
      }
    } else {
      this.authService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (user) => {
            if (user) { this.currentUser = user; this.loadUserProfile(); }
            else       { this.router.navigate(['/login']); }
          },
          error: () => this.router.navigate(['/login'])
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopFaceCamera();
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  loadUserProfile(): void {
    if (!this.currentUser?.id) { this.isLoading = false; return; }

    this.userService.getUserById(this.currentUser.id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoading = false))
      .subscribe({
        next: (profile) => {
          this.userProfile   = profile;
          this.avatarPreview = profile.avatar || null;

          let formattedDate = '';
          if (profile.birthDate) {
            try {
              const d = new Date(profile.birthDate);
              if (!isNaN(d.getTime())) formattedDate = d.toISOString().split('T')[0];
            } catch {}
          }
          this.profileForm.patchValue({
            name: profile.name || '', lastName: profile.lastName || '',
            email: profile.email || '', birthDate: formattedDate,
            bio: profile.bio || ''
          });
        },
        error: (error) => {
          this.loadError = error.message || 'Failed to load profile';
          this.notificationService.error(this.loadError!);
        }
      });
  }

  // ── Avatar Upload ────────────────────────────────────────────────────
  onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notificationService.error('Please select an image file'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notificationService.error('Image must be smaller than 5MB'); return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > h) { h = Math.round((h / w) * MAX); w = MAX; }
        else        { w = Math.round((w / h) * MAX); h = MAX; }
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.7);

        this.avatarPreview = base64;
        if (!this.currentUser?.id) return;
        this.isUploadingAvatar = true;

        this.userService.updateAvatar(this.currentUser.id, base64)
          .pipe(finalize(() => this.isUploadingAvatar = false))
          .subscribe({
            next: (updated) => {
              this.userProfile.avatar = updated.avatar;
              this.authService.updateSessionAvatar(updated.avatar);
              this.notificationService.success('Profile picture updated!');
            },
            error: () => {
              this.notificationService.error('Failed to upload picture');
              this.avatarPreview = this.userProfile?.avatar || null;
            }
          });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  // ── AI Avatar Modal ──────────────────────────────────────────────────
  openAiAvatarModal(): void {
    this.showAiAvatarModal      = true;
    this.generatedImages        = [];
    this.loadedImages           = new Set<string>();
    this.imageStates            = {};
    this.selectedGeneratedImage = null;
    this.aiPromptText           = '';
    this.isGenerating           = false;
  }

  closeAiAvatarModal(): void { this.showAiAvatarModal = false; }

  generateAiAvatars(): void {
    this.isGenerating           = true;
    this.generatedImages        = [];
    this.loadedImages           = new Set<string>();
    this.imageStates            = {};
    this.selectedGeneratedImage = null;
    this.cdr.detectChanges();

    const styleMap: Record<string, string[]> = {
      professional: ['notionists', 'lorelei', 'micah', 'personas'],
      artistic:     ['adventurer', 'open-peeps', 'notionists', 'micah'],
      cartoon:      ['avataaars', 'big-smile', 'adventurer', 'fun-emoji'],
      minimalist:   ['miniavs', 'thumbs', 'initials', 'shapes'],
      cyberpunk:    ['bottts', 'identicon', 'rings', 'pixel-art'],
      fantasy:      ['lorelei', 'adventurer', 'open-peeps', 'micah'],
    };

    const diceBearStyles = styleMap[this.selectedStyle] || styleMap['professional'];
    const custom         = this.aiPromptText.trim() || 'avatar';
    const bgColors       = 'b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';

    const urls = diceBearStyles.map(style => {
      const seed = encodeURIComponent(custom + Math.floor(Math.random() * 100000));
      return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${bgColors}`;
    });

    this.generatedImages = urls;
    urls.forEach(url => { this.imageStates[url] = 'loaded'; });
    this.loadedImages    = new Set(urls);
    this.isGenerating    = false;
    this.cdr.detectChanges();
  }

  onImageLoad(img: string): void {
    this.imageStates  = { ...this.imageStates, [img]: 'loaded' };
    this.loadedImages = new Set(this.loadedImages).add(img);
    this.cdr.detectChanges();
  }

  onImageError(event: Event, img: string): void {
    this.imageStates = { ...this.imageStates, [img]: 'error' };
    this.cdr.detectChanges();
  }

  isImageLoading(img: string): boolean { return this.imageStates[img] === 'loading'; }
  isImageLoaded(img: string):  boolean { return this.imageStates[img] === 'loaded'; }
  isImageError(img: string):   boolean { return this.imageStates[img] === 'error'; }
  getErrorCount(): number {
    return Object.values(this.imageStates).filter(s => s === 'error').length;
  }

  selectGeneratedImage(img: string): void { this.selectedGeneratedImage = img; }

  applyGeneratedAvatar(): void {
    if (!this.selectedGeneratedImage || !this.currentUser?.id) return;

    this.isUploadingAvatar = true;
    this.cdr.detectChanges();

    fetch(this.selectedGeneratedImage)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .then(base64 => this.userService.updateAvatar(this.currentUser!.id, base64).toPromise())
      .then((updated: any) => {
        const newAvatar         = updated?.avatar || this.selectedGeneratedImage!;
        this.avatarPreview      = newAvatar;
        this.userProfile.avatar = newAvatar;
        this.authService.updateSessionAvatar(newAvatar);
        this.closeAiAvatarModal();
        this.notificationService.success('AI avatar applied! 🎉');
      })
      .catch(() => this.notificationService.error('Failed to apply avatar.'))
      .finally(() => { this.isUploadingAvatar = false; this.cdr.detectChanges(); });
  }

  // ── AI Bio Generator ─────────────────────────────────────────────────
  toggleBioPanel(): void {
    this.showBioPanel = !this.showBioPanel;
    if (!this.showBioPanel) {
      this.generatedBio = '';
      this.bioExtra     = '';
      this.bioSaved     = false;
    }
  }

  generateBio(): void {
    if (!this.currentUser?.id) return;

    this.isGeneratingBio = true;
    this.generatedBio    = '';

    this.http.post<{ bio: string }>(
      `${this.API}/users/${this.currentUser.id}/generate-bio`,
      { tone: this.bioTone, extra: this.bioExtra }
    ).subscribe({
      next: (res) => {
        this.generatedBio    = res.bio;
        this.isGeneratingBio = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('Bio generation failed. Try again.');
        this.isGeneratingBio = false;
        this.cdr.detectChanges();
      }
    });
  }

  copyBio(): void {
    navigator.clipboard.writeText(this.generatedBio)
      .then(() => this.notificationService.success('Bio copied to clipboard!'))
      .catch(() => this.notificationService.error('Copy failed'));
  }

  useBio(): void {
    if (!this.generatedBio || !this.currentUser?.id) return;

    this.userService.updateBio(this.currentUser.id, this.generatedBio)
    .subscribe({
      next: (res) => {
        this.userProfile.bio = res.bio;
        this.profileForm.patchValue({ bio: res.bio });
        this.bioSaved = true;
        this.notificationService.success('Bio saved to your profile!');
        this.cdr.detectChanges();
      },
      error: () => this.notificationService.error('Failed to save bio. Try again.')
    });
  }

  // ── Profile Edit ─────────────────────────────────────────────────────
  toggleEditMode(): void {
    if (!this.isEditMode && this.userProfile) {
      let formattedDate = '';
      if (this.userProfile.birthDate) {
        try {
          const d = new Date(this.userProfile.birthDate);
          if (!isNaN(d.getTime())) formattedDate = d.toISOString().split('T')[0];
        } catch {}
      }
      this.profileForm.patchValue({
        name: this.userProfile.name || '', lastName: this.userProfile.lastName || '',
        email: this.userProfile.email || '', birthDate: formattedDate,
        bio: this.userProfile.bio || ''
      });
    }
    this.isEditMode         = !this.isEditMode;
    this.showPasswordChange = false;
    this.showBioPanel       = false;
    this.showFaceSetupPanel = false;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.notificationService.error('Please fill all required fields'); return;
    }
    if (!this.currentUser?.id) return;

    this.isLoading = true;
    const { bio, ...profileData } = this.profileForm.value;

    this.userService.updateUser(this.currentUser.id, profileData)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (updatedProfile) => {
          this.userProfile = { ...updatedProfile, bio: bio || updatedProfile.bio };
          this.isEditMode  = false;

          // Persist bio separately via its own endpoint
          if (bio !== undefined && bio !== (updatedProfile.bio || '')) {
            this.userService.updateBio(this.currentUser!.id, bio)
            .subscribe({
              next: (res) => { this.userProfile.bio = res.bio; this.cdr.detectChanges(); }
            });
          }

          this.notificationService.success('Profile updated successfully');
        },
        error: (error) => this.notificationService.error(error.message || 'Update failed')
      });
  }

  cancelEdit(): void {
    this.isEditMode         = false;
    this.showPasswordChange = false;
    this.showBioPanel       = false;
    this.showFaceSetupPanel = false;
  }

  // ── Password Change ──────────────────────────────────────────────────
  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.notificationService.error(
        this.passwordForm.hasError('mismatch') ? 'Passwords do not match' : 'Please fill all fields'
      );
      return;
    }
    if (!this.currentUser?.id) return;

    const { currentPassword, newPassword } = this.passwordForm.value;
    this.isLoading = true;

    this.userService.changePassword(this.currentUser.id, currentPassword, newPassword)
      .pipe(finalize(() => {
        this.isLoading          = false;
        this.showPasswordChange = false;
        this.passwordForm.reset();
      }))
      .subscribe({
        next:  () => this.notificationService.success('Password changed successfully'),
        error: (error) => this.notificationService.error(error.message || 'Password change failed')
      });
  }

  // ── Delete Account ───────────────────────────────────────────────────
  openDeleteModal():  void { this.showDeleteModal = true; }
  closeDeleteModal(): void { this.showDeleteModal = false; }

  confirmDeleteAccount(): void {
    if (!this.currentUser?.id) return;

    this.isLoading = true;
    this.userService.deleteAccount(this.currentUser.id)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          this.notificationService.success('Account deleted');
          this.authService.logout();
          this.router.navigate(['/login']);
        },
        error: (error) => this.notificationService.error(error.message || 'Delete failed')
      });
  }

  /** @deprecated use openDeleteModal() instead */
  deleteAccount(): void { this.openDeleteModal(); }

  // ── Face ID Setup ────────────────────────────────────────────────────
  toggleFaceSetupPanel(): void {
    this.showFaceSetupPanel = !this.showFaceSetupPanel;
    if (!this.showFaceSetupPanel) {
      this.stopFaceCamera();
      this.faceStatus     = '';
      this.faceStatusType = 'idle';
      this.faceRingState  = '';
      this.enrollProgress = 0;
    } else {
      // slight delay so the video element renders first
      setTimeout(() => this.startFaceEnroll(), 150);
    }
  }

  clearFaceEnrollment(): void {
    this.faceAuthService.clearEnrollment();
    this.faceStatus     = '';
    this.faceStatusType = 'idle';
    this.faceRingState  = '';
    this.enrollProgress = 0;
    this.notificationService.success('Face ID removed');
    this.cdr.detectChanges();
  }

  private stopFaceCamera(): void {
    this.faceAbort = true;
    if (this.faceVideo) this.faceAuthService.stopCamera(this.faceVideo);
  }

  private setFaceStatus(type: typeof this.faceStatusType, msg: string, ring = ''): void {
    this.faceStatusType = type;
    this.faceStatus     = msg;
    this.faceRingState  = ring;
  }

  async startFaceEnroll(): Promise<void> {
    const email = this.userProfile?.email || this.currentUser?.email;
    if (!email) {
      this.setFaceStatus('fail', 'Could not determine your email. Please reload.', 'error');
      return;
    }

    this.faceAbort      = false;
    this.isFaceWorking  = true;
    this.enrollProgress = 0;
    this.setFaceStatus('working', 'Loading AI models…', 'scanning');
    this.cdr.detectChanges();

    try {
      await this.faceAuthService.loadModels();
      await this.faceAuthService.startCamera(this.faceVideo);
      this.setFaceStatus('working', 'Look at the camera — capturing samples…', 'scanning');

      await this.faceAuthService.enroll(
        this.faceVideo,
        email,
        8,
        (n, total) => {
          if (!this.faceAbort) {
            this.enrollProgress = Math.round((n / total) * 100);
            this.faceStatus     = `Captured ${n} / ${total} samples`;
            this.cdr.detectChanges();
          }
        }
      );

      if (this.faceAbort) return;

      this.setFaceStatus('ok', 'Face ID set up successfully!', 'success');
      this.stopFaceCamera();
      this.isFaceWorking = false;
      this.cdr.detectChanges();

      this.notificationService.success('Face ID enabled! You can now sign in with your face.');

      setTimeout(() => {
        this.showFaceSetupPanel = false;
        this.faceStatus         = '';
        this.faceStatusType     = 'idle';
        this.faceRingState      = '';
        this.enrollProgress     = 0;
        this.cdr.detectChanges();
      }, 2000);

    } catch (e: any) {
      if (this.faceAbort) return;
      this.isFaceWorking = false;
      this.setFaceStatus('fail', 'Camera error: ' + e.message, 'error');
      this.stopFaceCamera();
      this.cdr.detectChanges();
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  formatDate(date: string): string {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return date; }
  }

  getInitials(): string {
    if (!this.userProfile?.name || !this.userProfile?.lastName) return '?';
    return `${this.userProfile.name.charAt(0)}${this.userProfile.lastName.charAt(0)}`.toUpperCase();
  }
}