import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FreelancerService } from '../../services/freelancer.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../../../services/auth.services';

const SKILL_ICONS: Record<string, string> = {
  angular:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angular/angular-original.svg',
  react:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  vue:         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg',
  javascript:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  typescript:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  python:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  java:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
  nodejs:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
  spring:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg',
  docker:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
  mysql:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  mongodb:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
  figma:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg',
  git:         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg',
  css:         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  html:        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  php:         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
  laravel:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-plain.svg',
  flutter:     'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg',
  kotlin:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',
  swift:       'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg',
  'c#':        'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg',
  csharp:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg',
  dotnet:      'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dot-net/dot-net-original.svg',
  aws:         'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg',
};

@Component({
  selector: 'app-freelancer-skills-setup',
  templateUrl: './freelancer-skills-setup.component.html',
  styleUrls: ['./freelancer-skills-setup.component.scss']
})
export class FreelancerSkillsSetupComponent implements OnInit {
  @Input() freelancerId!: number | null;
  @Output() close = new EventEmitter<void>();
  @Output() skillsSaved = new EventEmitter<void>();

  skillForm: FormGroup;
  addedSkills: any[] = [];
  isSubmitting = false;
  errorMessage = '';

  // CV
  resumeFile: File | null = null;
  resumeFileName = '';
  isUploadingResume = false;
  resumeUrl = '';
  isGeneratingResume = false;
  generatedResumeUrl: SafeResourceUrl | null = null;
  generatedResumeRawUrl: string | null = null;
  skillsAlreadySaved = false;

  skillLevels = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'];

  constructor(
    private fb: FormBuilder,
    private freelancerService: FreelancerService,
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) {
    this.skillForm = this.fb.group({
    skillName: ['', Validators.required],
    level: ['INTERMEDIATE', Validators.required],
    yearsExperience: [1, [Validators.required, Validators.min(0)]],
  });

  }

  ngOnInit(): void {
     if (!this.freelancerId) {
    this.freelancerId = this.authService.getCurrentUserId();
  }
  console.log('✅ freelancerId resolved:', this.freelancerId);
  }

  getSkillIcon(name: string): string | null {
    const key = name.toLowerCase().trim();
    return SKILL_ICONS[key] || null;
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  addSkillAndSave(): void {
    console.log('freelancerId:', this.freelancerId);  // ← vérifiez dans la console
  console.log('form valid:', this.skillForm.valid);
  console.log('form value:', this.skillForm.value);
  if (this.skillForm.invalid || !this.freelancerId) {
    this.skillForm.markAllAsTouched();
    return;
  }
  
  const val = this.skillForm.value;

  const already = this.addedSkills.some(
    s => s.skillName.toLowerCase() === val.skillName.toLowerCase()
  );
  if (already) {
    this.errorMessage = 'This skill is already added.';
    return;
  }

  const payload = {
    skillName: val.skillName,
    level: val.level,
    yearsExperience: val.yearsExperience,
    resumeUrl: this.resumeUrl  // vide si pas encore uploadé, c'est OK
  };

  this.freelancerService.createSkillForFreelancer(this.freelancerId, payload).subscribe({
    next: () => {
      this.addedSkills.push(val);           // afficher dans l'UI
      this.skillForm.patchValue({ skillName: '', yearsExperience: 1 });
      this.errorMessage = '';
      this.skillsAlreadySaved = true;       // pour que Save & Continue ne re-sauvegarde pas
    },
    error: () => {
      this.errorMessage = 'Error saving skill. Please try again.';
    }
  });
}
  // ─── CV Upload ────────────────────────────────────────────
  onResumeFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.resumeFile = input.files[0];
      this.resumeFileName = input.files[0].name;
    }
  }

  uploadResume(): void {
    if (!this.resumeFile || !this.freelancerId) return;
    this.isUploadingResume = true;
    this.freelancerService.uploadResume(this.freelancerId, this.resumeFile).subscribe({
      next: (res: string) => {
        this.resumeUrl = res;
        this.isUploadingResume = false;
        alert('✅ CV uploaded successfully!');
      },
      error: () => {
        this.isUploadingResume = false;
        alert('Error uploading CV.');
      }
    });
  }

  // ─── Generate Resume ──────────────────────────────────────
 generateResume(): void {
  if (!this.freelancerId) return;
  this.isGeneratingResume = true;
  this.generatedResumeUrl = null;
  this.generatedResumeRawUrl = null;
  this.doGenerateResume();
}
  private doGenerateResume(): void {
    this.freelancerService.generateResumePdf(this.freelancerId!).subscribe({
      next: (blob) => {
        const rawUrl = URL.createObjectURL(blob);
        this.generatedResumeRawUrl = rawUrl;
        this.generatedResumeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
        this.isGeneratingResume = false;
      },
      error: () => {
        this.isGeneratingResume = false;
        alert('Error generating resume. Please try again.');
      }
    });
  }
downloadResume(): void {
  if (!this.generatedResumeRawUrl) return;
  const a = document.createElement('a');
  a.href = this.generatedResumeRawUrl;
  a.download = 'resume.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
  // ─── Save ─────────────────────────────────────────────────
  save(): void {
  if (!this.freelancerId) return;

  if (this.skillsAlreadySaved || this.addedSkills.length === 0) {
    this.skillsSaved.emit();
    return;
  }

  if (this.addedSkills.length === 0) {
    this.errorMessage = 'Please add at least one skill.';
    return;
  }

    this.isSubmitting = true;
    let saved = 0;

    this.addedSkills.forEach(skill => {
      const payload = { ...skill, resumeUrl: this.resumeUrl };
      this.freelancerService.createSkillForFreelancer(this.freelancerId!, payload).subscribe({
        next: () => {
          saved++;
          if (saved === this.addedSkills.length) {
            this.isSubmitting = false;
            this.skillsSaved.emit();
          }
        },
        error: () => {
          this.errorMessage = 'Error saving skills. Please try again.';
          this.isSubmitting = false;
        }
      });
    });
  }
}