import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.services';
import { FaceAuthService } from '../../../services/face-auth.service';
import { AuthRequest, AuthResponse } from '../auth.models';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {

  @ViewChild('faceVideo') faceVideoRef!: ElementRef<HTMLVideoElement>;

  loginForm:     FormGroup;
  forgotForm:    FormGroup;
  twoFactorForm: FormGroup;

  isLoading     = false;
  googleLoading = false;
  showPassword  = false;
  currentYear   = new Date().getFullYear();

  // face-enroll view removed — enrollment now lives in the profile page
  view: 'login' | 'forgot' | '2fa' | 'forgot-sent' | 'face-login' = 'login';

  loginError        = '';
  registeredSuccess = false;

  verifiedSuccess       = false;
  showNotVerifiedModal  = false;
  notVerifiedEmail      = '';

  failedAttempts = 0;
  lockoutUntil: Date | null = null;

  showSuspendedModal = false;
  suspendedMessage   = '';

  // ── Face Auth state ──────────────────────────────────────────────────────
  faceStatus      = '';
  faceStatusType: 'idle' | 'working' | 'ok' | 'fail' = 'idle';
  faceRingState   = '';
  isFaceWorking   = false;
  private faceAbort = false;

  get hasFaceEnrolled(): boolean { return this.faceAuthService.hasEnrollment(); }

  get isLockedOut(): boolean {
    return !!this.lockoutUntil && new Date() < this.lockoutUntil;
  }
  get lockoutSeconds(): number {
    if (!this.lockoutUntil) return 0;
    return Math.ceil((this.lockoutUntil.getTime() - Date.now()) / 1000);
  }

  captchaA = 0;
  captchaB = 0;
  get captchaQuestion(): string { return `${this.captchaA} + ${this.captchaB} = ?`; }

  private readonly API = 'http://localhost:8222/api/auth';

  constructor(
    private fb:              FormBuilder,
    private router:          Router,
    private route:           ActivatedRoute,
    private http:            HttpClient,
    private authService:     AuthService,
    private faceAuthService: FaceAuthService
  ) {
    this.loginForm = this.fb.group({
      email:      ['', [Validators.required, Validators.email]],
      password:   ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
      captcha:    ['', Validators.required]
    });

    this.forgotForm = this.fb.group({
      forgotEmail: ['', [Validators.required, Validators.email]]
    });

    this.twoFactorForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });

    this.refreshCaptcha();
  }

  ngOnInit(): void {
    document.body.classList.add('auth-page');

    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true') {
        this.registeredSuccess = true;
        setTimeout(() => this.registeredSuccess = false, 5000);
      }
      if (params['verified'] === 'true') {
        this.verifiedSuccess = true;
        setTimeout(() => this.verifiedSuccess = false, 6000);
      }
    });

    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      this.loginForm.patchValue({ email: rememberedEmail, rememberMe: true });
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('auth-page');
    this.stopFaceCamera();
  }

  // ── Standard login helpers ────────────────────────────────────────────────

  togglePassword(): void { this.showPassword = !this.showPassword; }

  refreshCaptcha(): void {
    this.captchaA = Math.floor(Math.random() * 9) + 1;
    this.captchaB = Math.floor(Math.random() * 9) + 1;
    this.loginForm.get('captcha')?.setValue('');
  }

  isCaptchaCorrect(): boolean {
    const answer = parseInt(this.loginForm.get('captcha')?.value, 10);
    return answer === this.captchaA + this.captchaB;
  }

  switchView(v: typeof this.view): void {
    if (this.view === 'face-login') {
      this.stopFaceCamera();
    }
    this.view       = v;
    this.loginError = '';

    if (v === 'face-login') setTimeout(() => this.startFaceLogin(), 100);
  }

  closeSuspendedModal(): void {
    this.showSuspendedModal = false;
    this.suspendedMessage   = '';
  }

  closeNotVerifiedModal(): void {
    this.showNotVerifiedModal = false;
    this.notVerifiedEmail     = '';
  }

  resendFromLogin(): void {
    this.http.post(`${this.API}/resend-verification`, { email: this.notVerifiedEmail }, { responseType: 'text' }).subscribe({
      next: () => {
        this.showNotVerifiedModal = false;
        this.loginError = '✅ Verification email resent! Check your inbox.';
      },
      error: () => {}
    });
  }

  private getErrorMessage(err: any): string {
    if (typeof err.error === 'string') return err.error;
    if (err.error?.message) return err.error.message;
    if (err.error?.error) return err.error.error;
    return '';
  }

  // ── Standard submit ───────────────────────────────────────────────────────

  onSubmit(): void {
    this.loginError = '';
    if (this.isLockedOut) {
      this.loginError = `Too many attempts. Try again in ${this.lockoutSeconds}s.`;
      return;
    }
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    if (!this.isCaptchaCorrect()) {
      this.loginError = 'Incorrect captcha answer. Please try again.';
      this.refreshCaptcha();
      return;
    }

    this.isLoading = true;

    const authRequest: AuthRequest = {
      email:    this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(authRequest).subscribe({
      next: (res: AuthResponse) => {
        this.isLoading      = false;
        this.failedAttempts = 0;

        if (this.loginForm.value.rememberMe) {
          localStorage.setItem('rememberedEmail', authRequest.email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        res.role === 'ADMIN'
          ? this.router.navigate(['/admin/dashboard'])
          : this.router.navigate(['/app']);
      },
      error: (err) => {
        this.isLoading = false;
        this.refreshCaptcha();

        const msg = this.getErrorMessage(err);

        if (err.status === 403 && (msg.includes('email-not-verified') || msg.includes('email') || err.error === 'email-not-verified')) {
          this.notVerifiedEmail     = authRequest.email;
          this.showNotVerifiedModal = true;
          return;
        }
        if (err.status === 403) {
          this.suspendedMessage   = 'This account has been deactivated. Please contact support.';
          this.showSuspendedModal = true;
          return;
        }
        if (err.status === 423) {
          this.suspendedMessage   = 'Your account is temporarily suspended. Please try again later.';
          this.showSuspendedModal = true;
          return;
        }

        this.failedAttempts++;
        if (this.failedAttempts >= 5) {
          this.lockoutUntil = new Date(Date.now() + 60_000);
          this.loginError   = 'Too many failed attempts. Locked for 60 seconds.';
          setTimeout(() => { this.lockoutUntil = null; this.failedAttempts = 0; }, 60_000);
        } else {
          const remaining = 5 - this.failedAttempts;
          this.loginError = `Invalid email or password. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`;
        }
      }
    });
  }

  onForgotSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const email    = this.forgotForm.value.forgotEmail;
    this.http.post(`${this.API}/forgot-password`, { email }, { responseType: 'text' }).subscribe({
      next:  () => { this.isLoading = false; this.switchView('forgot-sent'); },
      error: () => { this.isLoading = false; this.switchView('forgot-sent'); }
    });
  }

  onTwoFactorSubmit(): void {
    if (this.twoFactorForm.invalid) {
      this.twoFactorForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/app']);
    }, 1000);
  }

  loginWithGoogle(): void {
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
      const { token, id, role, name, lastName, email, imageUrl } = event.data;
      if (token) {
        this.authService.setSession({ id, role, token, name, lastName, imageUrl } as any, email);
        popup?.close();
        window.removeEventListener('message', handler);
        this.googleLoading = false;
        role === 'ADMIN'
          ? this.router.navigate(['/admin/dashboard'])
          : this.router.navigate(['/app']);
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

  // ── Face helpers ──────────────────────────────────────────────────────────

  private get faceVideo(): HTMLVideoElement {
    return this.faceVideoRef?.nativeElement;
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

  // ── Face Login ────────────────────────────────────────────────────────────

  async startFaceLogin(): Promise<void> {
    this.faceAbort     = false;
    this.isFaceWorking = true;
    this.setFaceStatus('working', 'Loading AI models…', 'scanning');

    try {
      await this.faceAuthService.loadModels();
      await this.faceAuthService.startCamera(this.faceVideo);
      this.setFaceStatus('working', 'Hold still, scanning your face…', 'scanning');

      const matchedEmail = await this.faceAuthService.verify(
        this.faceVideo,
        30,
        msg => { if (!this.faceAbort) this.faceStatus = msg; }
      );

      if (this.faceAbort) return;

      this.setFaceStatus('ok', `Face matched! Signing you in…`, 'success');
      this.stopFaceCamera();

      this.http.post<any>(`${this.API}/face-login`, { email: matchedEmail }).subscribe({
        next: (res) => {
          this.isFaceWorking = false;

          const session = {
            id:       res.id,
            email:    res.email,
            name:     res.name,
            lastName: res.lastName,
            role:     res.role,
            token:    res.token
          };
          localStorage.setItem('sessionUser', JSON.stringify(session));
          this.authService.setSession(res, res.email);

          this.setFaceStatus('ok', `Welcome back, ${res.name}!`, 'success');

          setTimeout(() => {
            res.role === 'ADMIN'
              ? this.router.navigate(['/admin/dashboard'])
              : this.router.navigate(['/app']);
          }, 800);
        },
        error: () => {
          this.isFaceWorking = false;
          this.setFaceStatus('fail', 'Face matched but login failed. Try email login.', 'error');
        }
      });

    } catch (e: any) {
      if (this.faceAbort) return;
      this.isFaceWorking = false;
      if (e.message === 'NO_ENROLLMENT') {
        this.setFaceStatus('fail', 'No face enrolled on this device. Set up Face ID in your profile.', 'error');
      } else if (e.message === 'NO_MATCH') {
        this.setFaceStatus('fail', 'Face not recognized. Try again or use email login.', 'error');
      } else {
        this.setFaceStatus('fail', 'Camera error: ' + e.message, 'error');
      }
      this.stopFaceCamera();
    }
  }
}