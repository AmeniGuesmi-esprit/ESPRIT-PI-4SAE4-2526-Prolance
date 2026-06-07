import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value || '';
  const errors: ValidationErrors = {};
  if (!/[A-Z]/.test(val))        errors['noUppercase'] = true;
  if (!/[a-z]/.test(val))        errors['noLowercase'] = true;
  if (!/[0-9]/.test(val))        errors['noNumber']    = true;
  if (!/[^A-Za-z0-9]/.test(val)) errors['noSpecial']   = true;
  return Object.keys(errors).length ? errors : null;
}

function passwordMatchValidator(g: FormGroup): ValidationErrors | null {
  return g.get('newPassword')?.value === g.get('confirmPassword')?.value
    ? null : { mismatch: true };
}

export interface StrengthResult {
  score: number;
  label: string;
  color: string;
  width: string;
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;

  token        = '';
  isLoading    = false;
  showPassword = false;
  showConfirm  = false;
  currentYear  = new Date().getFullYear();

  // view: 'validating' | 'valid' | 'invalid' | 'success'
  view: 'validating' | 'valid' | 'invalid' | 'success' = 'validating';

  errorMessage = '';
  passwordStrength: StrengthResult = { score: 0, label: '', color: '', width: '0%' };

  private readonly API = 'http://localhost:8222/api/auth';

  constructor(
    private fb:    FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http:  HttpClient
  ) {
    this.resetForm = this.fb.group({
      newPassword:     ['', [Validators.required, Validators.minLength(8), strongPasswordValidator]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });

    this.resetForm.get('newPassword')!.valueChanges.subscribe(val => {
      this.passwordStrength = this.computeStrength(val || '');
    });
  }

  ngOnInit(): void {
    document.body.classList.add('auth-page');

    // Read token from URL: /#/reset-password?token=xxx
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.view = 'invalid';
        return;
      }
      this.validateToken();
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('auth-page');
  }

  validateToken(): void {
    this.http.get(`${this.API}/validate-reset-token?token=${this.token}`).subscribe({
      next: ()  => { this.view = 'valid'; },
      error: () => { this.view = 'invalid'; }
    });
  }

  onSubmit(): void {
  if (this.resetForm.invalid) {
    this.resetForm.markAllAsTouched();
    return;
  }

  this.isLoading    = true;
  this.errorMessage = '';

  this.http.post(`${this.API}/reset-password`, {
    token:       this.token,
    newPassword: this.resetForm.value.newPassword
  }, { responseType: 'text' }).subscribe({   // ← ADD responseType: 'text'
    next: () => {
      this.isLoading = false;
      this.view      = 'success';
      setTimeout(() => this.router.navigate(['/login']), 3000);
    },
    error: (err) => {
      this.isLoading = false;
      if (typeof err.error === 'string') {
        this.errorMessage = err.error;
      } else if (err.error?.message) {
        this.errorMessage = err.error.message;
      } else {
        this.errorMessage = 'Something went wrong. Please request a new reset link.';
      }
    }
  });
}
  // ── Helpers ──────────────────────────────────────────────────
  get pwVal(): string    { return this.resetForm.get('newPassword')?.value || ''; }
  get hasUpper():   boolean { return /[A-Z]/.test(this.pwVal); }
  get hasLower():   boolean { return /[a-z]/.test(this.pwVal); }
  get hasNumber():  boolean { return /[0-9]/.test(this.pwVal); }
  get hasSpecial(): boolean { return /[^A-Za-z0-9]/.test(this.pwVal); }
  get hasLength():  boolean { return this.pwVal.length >= 8; }

  computeStrength(pw: string): StrengthResult {
    let score = 0;
    if (pw.length >= 8)            score++;
    if (/[A-Z]/.test(pw))         score++;
    if (/[0-9]/.test(pw))         score++;
    if (/[^A-Za-z0-9]/.test(pw))  score++;

    const map: Record<number, Omit<StrengthResult, 'score'>> = {
      0: { label: '',       color: '',        width: '0%'   },
      1: { label: 'Weak',   color: '#ef5350', width: '25%'  },
      2: { label: 'Fair',   color: '#ffa726', width: '50%'  },
      3: { label: 'Good',   color: '#66bb6a', width: '75%'  },
      4: { label: 'Strong', color: '#43a047', width: '100%' },
    };
    return { score, ...map[score] };
  }
}