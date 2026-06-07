import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Project } from '../../models/project.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FreelancerService } from '../../services/freelancer.service';
import { AuthService } from '../../../../services/auth.services';

const SKILL_ICONS: Record<string, string> = {
  angular:    'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angular/angular-original.svg',
  react:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  vue:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg',
  javascript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  typescript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  python:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  java:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
  nodejs:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
  spring:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg',
  docker:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
  mysql:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  mongodb:    'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
  figma:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg',
  git:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg',
  css:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  html:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  php:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
  flutter:    'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg',
  kotlin:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',
  swift:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg',
  csharp:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg',
  'c#':       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg',
  aws:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg',
};

@Component({
  selector: 'app-freelancer-apply',
  templateUrl: './freelancer-apply.component.html',
  styleUrls: ['./freelancer-apply.component.scss']
})
export class FreelancerApplyComponent implements OnInit {
  @Input() project?: Project;
  @Output() close = new EventEmitter<void>();
  @Output() applied = new EventEmitter<void>();

  currentStep: 'skills' | 'application' = 'skills';

  mySkills: any[] = [];
  selectedSkills: any[] = [];
  loadingSkills = true;

  form: FormGroup;

  coverLetterMode: 'text' | 'upload' | 'generate' | null = null;

  // Upload mode
  coverLetterFile: File | null = null;
  coverLetterFileName = '';
  isUploadingFile = false;
  coverLetterRelativePath: string | null = null;
  coverLetterPreviewUrl: string | null = null;

  // Generate mode
  isGeneratingLetter = false;
  generatedRelativePath: string | null = null;
  generatedPreviewUrl: string | null = null;

  // States
  isSubmitting = false;
  showSuccessModal = false;
  errorMessage = '';

  currentUserId: number | null = null;

 private readonly backendBase = 'http://localhost:8222';

  constructor(
    private fb: FormBuilder,
    private freelancerService: FreelancerService,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      coverLetter: ['', Validators.minLength(20)],
    });
  }

  ngOnInit(): void {
  const user = this.authService.getCurrentUser();
  this.currentUserId = user?.userId ?? (user as any)?.id ?? null;  
  console.log('✅ currentUserId:', this.currentUserId);
  this.loadMySkills();
}

 loadMySkills(): void {
  if (!this.currentUserId) {
    console.error('❌ currentUserId is null — skills cannot be loaded');
    this.loadingSkills = false;
    return;
  }
  this.loadingSkills = true;
  this.freelancerService.getFreelancerSkills(this.currentUserId).subscribe({
    next: (skills) => {
      this.mySkills = skills;
      this.loadingSkills = false;
    },
    error: (err) => {
      console.error('❌ Error loading skills:', err);
      this.loadingSkills = false;
    }
  });
}
  getSkillIcon(name: string): string | null {
    return SKILL_ICONS[name?.toLowerCase()?.trim()] || null;
  }

  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || '?';
  }

  toggleSkill(skill: any): void {
    const idx = this.selectedSkills.findIndex(s => s.id === skill.id);
    if (idx >= 0) this.selectedSkills.splice(idx, 1);
    else this.selectedSkills.push(skill);
  }

  isSkillSelected(skill: any): boolean {
    return this.selectedSkills.some(s => s.id === skill.id);
  }

  nextStep(): void {
    if (this.selectedSkills.length === 0) return;
    this.errorMessage = '';
    this.currentStep = 'application';
  }

  // ─── Upload cover letter ──────────────────────────────────

  onCoverLetterFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.coverLetterFile = input.files[0];
      this.coverLetterFileName = input.files[0].name;
      this.coverLetterRelativePath = null;
      this.coverLetterPreviewUrl = null;
      this.errorMessage = '';
    }
  }

  uploadCoverLetterFile(): void {
    if (!this.coverLetterFile || !this.currentUserId) return;
    this.isUploadingFile = true;
    this.errorMessage = '';

    this.freelancerService.uploadCoverLetter(this.currentUserId, this.coverLetterFile).subscribe({
      next: (relativePath: string) => {
        this.coverLetterRelativePath = relativePath;
        this.coverLetterPreviewUrl   = `${this.backendBase}${relativePath}`;
        this.isUploadingFile = false;
      },
      error: (err) => {
        console.error('Upload error:', err);
        this.isUploadingFile = false;
        this.errorMessage = 'Error uploading the file. Please try again.';
      }
    });
  }

  // ─── Generate cover letter ───────────────────────────────

  generateCoverLetter(): void {
    if (!this.currentUserId || !this.project?.id) return;
    this.isGeneratingLetter = true;
    this.generatedRelativePath = null;
    this.generatedPreviewUrl   = null;
    this.errorMessage = '';

    this.freelancerService.generateCoverLetterAsString(this.currentUserId, this.project.id).subscribe({
      next: (relativePath: string) => {
        this.generatedRelativePath = relativePath;
        this.generatedPreviewUrl   = `${this.backendBase}${relativePath}`;
        this.isGeneratingLetter = false;
      },
      error: (err) => {
        console.error('Generate error:', err);
        this.isGeneratingLetter = false;
        this.errorMessage = 'Error generating cover letter. Make sure you have added skills first.';
      }
    });
  }

  // ─── Submit ──────────────────────────────────────────────

  submitApplication(): void {
    if (!this.currentUserId || !this.project?.id) return;
    this.errorMessage = '';

    const hasText      = this.coverLetterMode === 'text'
                         && (this.form.value.coverLetter?.length ?? 0) >= 20;
    const hasUploaded  = this.coverLetterMode === 'upload'  && !!this.coverLetterRelativePath;
    const hasGenerated = this.coverLetterMode === 'generate' && !!this.generatedRelativePath;

    if (this.coverLetterMode === 'upload' && this.coverLetterFile && !this.coverLetterRelativePath) {
      this.errorMessage = 'Please click "Upload" to upload your PDF before submitting.';
      return;
    }

    if (!hasText && !hasUploaded && !hasGenerated) {
      this.errorMessage = 'Please provide a cover letter (write, upload a PDF, or generate one).';
      return;
    }

    this.isSubmitting = true;

    let coverLetterValue: string;
    if (hasText)           coverLetterValue = this.form.value.coverLetter;
    else if (hasUploaded)  coverLetterValue = this.coverLetterRelativePath!;
    else                   coverLetterValue = this.generatedRelativePath!;

    const payload = {
      freelancerId:   this.currentUserId,
      projectId:      this.project.id,
      coverLetterUrl: coverLetterValue
    };

    this.freelancerService.submitApplication(payload).subscribe({
      next: () => this.onSuccess(),
      error: (err) => this.onError(err)
    });
  }

  private onSuccess(): void {
    this.isSubmitting = false;
    this.showSuccessModal = true;
  }

  private onError(err: any): void {
    console.error(err);
    this.isSubmitting = false;
    this.errorMessage = `Submission failed (${err.status}). Please try again.`;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.applied.emit();
    this.close.emit();
  }

  closeModal(): void {
    this.close.emit();
  }
}