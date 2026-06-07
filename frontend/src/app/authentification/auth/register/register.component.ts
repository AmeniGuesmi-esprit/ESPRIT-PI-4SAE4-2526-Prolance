import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.services';
import { FaceAuthService } from '../../../services/face-auth.service';
import { RegisterRequest } from '../auth.models';

// ── Custom Validators ─────────────────────────────────────────
function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value || '';
  const errors: ValidationErrors = {};
  if (!/[A-Z]/.test(val))        errors['noUppercase']  = true;
  if (!/[a-z]/.test(val))        errors['noLowercase']  = true;
  if (!/[0-9]/.test(val))        errors['noNumber']     = true;
  if (!/[^A-Za-z0-9]/.test(val)) errors['noSpecial']    = true;
  return Object.keys(errors).length ? errors : null;
}

function ageValidator(minAge: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const birth = new Date(control.value);
    const today = new Date();
    const age   = today.getFullYear() - birth.getFullYear();
    const hasBirthdayPassed =
      today.getMonth() > birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    const realAge = hasBirthdayPassed ? age : age - 1;
    return realAge < minAge ? { tooYoung: { required: minAge, actual: realAge } } : null;
  };
}

export interface StrengthResult {
  score: number;
  label: string;
  color: string;
  width: string;
}

// Three registration stages:
// 'form'  → filling out the form
// 'face'  → optional face enrollment right after account creation
// 'done'  → email sent screen
type RegisterStage = 'form' | 'face' | 'done';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {

  @ViewChild('enrollVideo') enrollVideoRef!: ElementRef<HTMLVideoElement>;

  registerForm: FormGroup;
  isLoading     = false;
  showPassword  = false;
  googleLoading = false;
  currentYear   = new Date().getFullYear();
  userType: 'freelancer' | 'recruiter' = 'freelancer';

  passwordStrength: StrengthResult = { score: 0, label: '', color: '', width: '0%' };
  emailTaken = false;

  // Stage control
  stage: RegisterStage = 'form';
  registeredEmail = '';

  // Face enroll state
  faceStatus      = '';
  faceStatusType: 'idle' | 'working' | 'ok' | 'fail' = 'idle';
  faceRingState   = '';
  enrollProgress  = 0;
  isFaceWorking   = false;
  private faceAbort = false;

  private readonly API = 'http://localhost:8222/api/auth';

  constructor(
    private fb:              FormBuilder,
    private router:          Router,
    private http:            HttpClient,
    private authService:     AuthService,
    private faceAuthService: FaceAuthService
  ) {
    this.registerForm = this.fb.group({
      fullName:   ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)]],
      lastName:   ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)]],
      email:      ['', [Validators.required, Validators.email]],
      birthDate:  ['', [Validators.required, ageValidator(16)]],
      password:   ['', [Validators.required, Validators.minLength(8), strongPasswordValidator]],
      agreeTerms: [false, [Validators.requiredTrue]]
    });

    this.registerForm.get('password')!.valueChanges.subscribe(val => {
      this.passwordStrength = this.computeStrength(val || '');
    });
  }

  ngOnInit(): void { document.body.classList.add('auth-page'); }
  ngOnDestroy(): void {
    document.body.classList.remove('auth-page');
    this.stopFaceCamera();
  }

  setUserType(type: 'freelancer' | 'recruiter'): void { this.userType = type; }
  togglePassword(): void { this.showPassword = !this.showPassword; }

  get pwVal(): string      { return this.registerForm.get('password')?.value || ''; }
  get pwTouched(): boolean { return !!this.registerForm.get('password')?.touched; }
  get hasUpper():   boolean { return /[A-Z]/.test(this.pwVal); }
  get hasLower():   boolean { return /[a-z]/.test(this.pwVal); }
  get hasNumber():  boolean { return /[0-9]/.test(this.pwVal); }
  get hasSpecial(): boolean { return /[^A-Za-z0-9]/.test(this.pwVal); }
  get hasLength():  boolean { return this.pwVal.length >= 8; }

  get maxDate(): string { return new Date().toISOString().split('T')[0]; }

  computeStrength(pw: string): StrengthResult {
    let score = 0;
    if (pw.length >= 8)           score++;
    if (/[A-Z]/.test(pw))        score++;
    if (/[0-9]/.test(pw))        score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const map: Record<number, Omit<StrengthResult, 'score'>> = {
      0: { label: '',       color: '',        width: '0%'   },
      1: { label: 'Weak',   color: '#ef5350', width: '25%'  },
      2: { label: 'Fair',   color: '#ffa726', width: '50%'  },
      3: { label: 'Good',   color: '#66bb6a', width: '75%'  },
      4: { label: 'Strong', color: '#43a047', width: '100%' },
    };
    return { score, ...map[score] };
  }

  resendVerification(): void {
    this.isLoading = true;
    this.http.post(`${this.API}/resend-verification`, { email: this.registeredEmail }).subscribe({
      next: () => { this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Submit ────────────────────────────────────────────────

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const request: RegisterRequest = {
      name:      this.registerForm.value.fullName,
      lastName:  this.registerForm.value.lastName,
      email:     this.registerForm.value.email,
      password:  this.registerForm.value.password,
      role:      this.userType === 'freelancer' ? 'FREELANCER' : 'CLIENT',
      birthDate: this.registerForm.value.birthDate
    };

    this.authService.register(request).subscribe({
      next: () => {
        this.isLoading       = false;
        this.registeredEmail = request.email;
        // Go to face enroll step
        this.stage = 'face';
        this.setFaceStatus('idle', '');
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 409 || err.error?.message?.toLowerCase().includes('email')) {
          this.emailTaken = true;
          this.registerForm.get('email')?.setErrors({ taken: true });
        }
        console.error('Registration failed', err);
      }
    });
  }

  // ── Face enroll (called from template button) ─────────────

  async startFaceEnroll(): Promise<void> {
    this.faceAbort      = false;
    this.isFaceWorking  = true;
    this.enrollProgress = 0;
    this.setFaceStatus('working', 'Loading AI models…', 'scanning');

    try {
      await this.faceAuthService.loadModels();
      await this.faceAuthService.startCamera(this.enrollVideoRef.nativeElement);
      this.setFaceStatus('working', 'Look at the camera — capturing samples…', 'scanning');

      await this.faceAuthService.enroll(
        this.enrollVideoRef.nativeElement,
        this.registeredEmail,
        8,
        (n, total) => {
          if (!this.faceAbort) {
            this.enrollProgress = Math.round((n / total) * 100);
            this.faceStatus     = `Captured ${n} / ${total} samples`;
          }
        }
      );

      if (this.faceAbort) return;

      this.setFaceStatus('ok', 'Face enrolled! Your account is ready.', 'success');
      this.stopFaceCamera();
      this.isFaceWorking = false;

      // Move to done after short delay
      setTimeout(() => { this.stage = 'done'; }, 1500);

    } catch (e: any) {
      if (this.faceAbort) return;
      this.isFaceWorking = false;
      this.setFaceStatus('fail', 'Camera error: ' + (e.message || e), 'error');
      this.stopFaceCamera();
    }
  }

  // Skip face enroll → go straight to done screen
  skipFaceEnroll(): void {
    this.stopFaceCamera();
    this.stage = 'done';
  }

  private stopFaceCamera(): void {
    this.faceAbort = true;
    const vid = this.enrollVideoRef?.nativeElement;
    if (vid) this.faceAuthService.stopCamera(vid);
  }

  private setFaceStatus(type: typeof this.faceStatusType, msg: string, ring = ''): void {
    this.faceStatusType = type;
    this.faceStatus     = msg;
    this.faceRingState  = ring;
  }

  // ── Google OAuth ──────────────────────────────────────────

  registerWithGoogle(): void {
    this.googleLoading = true;
    const width = 500, height = 600;
    const left  = window.screenX + (window.outerWidth  - width)  / 2;
    const top   = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      'http://localhost:8222/oauth2/authorization/google',
      'GoogleOAuth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    const handler = (event: MessageEvent) => {
      if (event.origin !== 'http://localhost:8081') return;
      const { token, id, role, name, lastName, email } = event.data;
      if (token) {
        const user = { id, email, role, token, name, lastName };
        localStorage.setItem('sessionUser', JSON.stringify(user));
        popup?.close();
        window.removeEventListener('message', handler);
        this.googleLoading = false;
        this.router.navigate(['/app/dashboard']);
      }
    };

    window.addEventListener('message', handler);
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        this.googleLoading = false;
        window.removeEventListener('message', handler);
      }
    }, 500);
  }
}