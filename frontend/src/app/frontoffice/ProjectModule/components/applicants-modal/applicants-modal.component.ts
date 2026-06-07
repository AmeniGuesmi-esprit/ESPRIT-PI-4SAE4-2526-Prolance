import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Project } from '../../models/project.model';
import { FreelancerService } from '../../services/freelancer.service';
import { ProjectsService } from '../../services/projects.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-applicants-modal',
  templateUrl: './applicants-modal.component.html',
  styleUrls: ['./applicants-modal.component.scss']
})
export class ApplicantsModalComponent implements OnInit {
  @Input() project?: Project;
  @Output() close = new EventEmitter<void>();

  fullProject?: Project;
  applications: any[] = [];
  loading = true;
  activeTab: 'all' | 'matched' | 'not-matched' = 'all';
  isAccepting: number | null = null;
  isAutoAccepting = false;

  // ─── Skill relevance map ──────────────────────────────────────
  // Keywords extracted from project title/description are matched
  // against these skill groups. Each group has a relevance weight.

  private readonly SKILL_GROUPS: { keywords: string[]; skills: string[]; weight: number }[] = [
    // Backend / Server
    { keywords: ['backend', 'server', 'api', 'rest', 'microservice', 'database', 'base de données', 'données', 'sql', 'spring', 'node', 'django', 'laravel'],
      skills: ['java', 'spring', 'spring boot', 'node', 'nodejs', 'python', 'django', 'php', 'laravel', 'sql', 'mysql', 'postgresql', 'mongodb', 'express', 'hibernate', 'jpa'],
      weight: 0.9 },

    // Frontend / UI
    { keywords: ['frontend', 'interface', 'ui', 'ux', 'web', 'application', 'app', 'site', 'page', 'utilisateur', 'user', 'interactive', 'interactif'],
      skills: ['angular', 'react', 'vue', 'typescript', 'javascript', 'html', 'css', 'sass', 'tailwind', 'bootstrap', 'figma', 'ui', 'ux'],
      weight: 0.8 },

    // Mobile
    { keywords: ['mobile', 'android', 'ios', 'app mobile', 'application mobile'],
      skills: ['flutter', 'react native', 'kotlin', 'swift', 'android', 'ios', 'dart'],
      weight: 0.9 },

    // Design
    { keywords: ['design', 'graphique', 'graphic', 'logo', 'branding', 'visual', 'visuel', 'maquette', 'prototype'],
      skills: ['figma', 'photoshop', 'illustrator', 'sketch', 'xd', 'canva', 'indesign', 'after effects', 'ui', 'ux'],
      weight: 0.9 },

    // Data / AI / ML
    { keywords: ['data', 'machine learning', 'ai', 'intelligence artificielle', 'analyse', 'analysis', 'model', 'modèle', 'prediction'],
      skills: ['python', 'tensorflow', 'pytorch', 'scikit', 'pandas', 'numpy', 'r', 'sql', 'spark', 'hadoop', 'machine learning', 'deep learning'],
      weight: 0.9 },

    // DevOps / Cloud
    { keywords: ['deploy', 'déploiement', 'cloud', 'infrastructure', 'devops', 'ci/cd', 'pipeline', 'docker', 'kubernetes'],
      skills: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'gitlab', 'terraform', 'ansible', 'linux'],
      weight: 0.9 },

    // E-learning specific
    { keywords: ['apprentissage', 'learning', 'cours', 'course', 'étudiant', 'student', 'éducation', 'education', 'exercice', 'quiz', 'lms'],
      skills: ['angular', 'react', 'vue', 'java', 'spring', 'python', 'javascript', 'typescript', 'sql', 'mongodb'],
      weight: 0.7 },
  ];

  constructor(
    private freelancerService: FreelancerService,
    private projectsService: ProjectsService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.project?.id) return;
    this.projectsService.getProjectById(this.project.id).subscribe({
      next: (fp) => { this.fullProject = fp; this.loadApplications(); },
      error: ()   => { this.fullProject = this.project; this.loadApplications(); }
    });
  }

  loadApplications(): void {
    this.loading = true;
    this.freelancerService.getApplicationsByProjectId(this.project!.id!).subscribe({
      next: (apps) => {
        this.applications = apps.map((app: any) => ({
          ...app,
          freelancerProfile: null,
          skills: [],
          matchScore: null
        }));

        let pending = this.applications.length;
        if (pending === 0) { this.loading = false; return; }

        this.applications.forEach((app: any) => {
          const fId = app.freelancerId;
          if (!fId) {
            app.matchScore = 0;
            pending--;
            if (pending === 0) { this.loading = false; this.cdr.detectChanges(); }
            return;
          }

          let appPending = 2;
          const tryFinalize = () => {
            appPending--;
            if (appPending === 0) {
              app.matchScore = this.computeMatchScore(app);
              pending--;
              if (pending === 0) { this.loading = false; this.cdr.detectChanges(); }
            }
          };

          this.freelancerService.getFreelancerById(fId).subscribe({
            next: (p) => { app.freelancerProfile = p; tryFinalize(); },
            error: ()  => { app.freelancerProfile = null; tryFinalize(); }
          });

          this.freelancerService.getFreelancerSkills(fId).subscribe({
            next: (s) => { app.skills = s || []; tryFinalize(); },
            error: ()  => { app.skills = []; tryFinalize(); }
          });
        });
      },
      error: () => { this.toast.error('Failed to load applicants.'); this.loading = false; }
    });
  }

  // ─── Smart match score ────────────────────────────────────────

  computeMatchScore(app: any): number {
    const project = this.fullProject;
    if (!project) return 0;

    const projectText = `${project.title} ${project.description} ${project.category}`.toLowerCase();
    const freelancerSkills: string[] = (app.skills || [])
      .map((s: any) => (s.skillName || '').toLowerCase().trim())
      .filter((s: string) => s.length > 0);

    if (freelancerSkills.length === 0) return 5;

    let totalScore = 0;
    let maxPossible = 0;

    // For each skill group, check if project matches group keywords
    // and if freelancer has skills from that group
    for (const group of this.SKILL_GROUPS) {
      const projectMatchesGroup = group.keywords.some(kw => projectText.includes(kw));
      if (!projectMatchesGroup) continue;

      maxPossible += group.weight * 100;

      const freelancerGroupSkills = freelancerSkills.filter(fs =>
        group.skills.some(gs => gs === fs || gs.includes(fs) || fs.includes(gs))
      );

      if (freelancerGroupSkills.length > 0) {
        // Score based on how many relevant skills they have (cap at 3)
        const coverage = Math.min(freelancerGroupSkills.length, 3) / 3;
        totalScore += group.weight * 100 * coverage;
      }
    }

    // Normalize to 0-80
    let score = maxPossible > 0 ? (totalScore / maxPossible) * 80 : 10;

    // Experience bonus: average years × 2, capped at 15
    const avgYears = (app.skills || []).reduce((sum: number, s: any) => sum + (s.yearsExperience || 0), 0)
      / Math.max((app.skills || []).length, 1);
    score += Math.min(avgYears * 2, 15);

    // Level bonus: EXPERT = 5pts, INTERMEDIATE = 2pts (per skill, capped at 5)
    const levelBonus = (app.skills || []).slice(0, 1).reduce((sum: number, s: any) => {
      if (s.level === 'EXPERT') return sum + 5;
      if (s.level === 'INTERMEDIATE') return sum + 2;
      return sum;
    }, 0);
    score += levelBonus;

    // Already accepted bonus
    if (app.accepted) score += 5;

    return Math.min(Math.round(score), 100);
  }

  // ─── Matched skills display ───────────────────────────────────

  getMatchedSkills(app: any): string[] {
    const project = this.fullProject;
    if (!project) return [];

    const projectText = `${project.title} ${project.description} ${project.category}`.toLowerCase();
    const freelancerSkills: string[] = (app.skills || [])
      .map((s: any) => (s.skillName || '').toLowerCase().trim());

    const matched: string[] = [];

    for (const group of this.SKILL_GROUPS) {
      const projectMatchesGroup = group.keywords.some(kw => projectText.includes(kw));
      if (!projectMatchesGroup) continue;

      freelancerSkills.forEach(fs => {
        if (group.skills.some(gs => gs === fs || gs.includes(fs) || fs.includes(gs))) {
          if (!matched.includes(fs)) matched.push(fs);
        }
      });
    }

    return matched;
  }

  getMissingSkills(app: any): string[] {
    return []; // Not applicable without explicit required skills
  }

  // ─── Tab control ─────────────────────────────────────────────

  setTab(tab: 'all' | 'matched' | 'not-matched'): void { this.activeTab = tab; }

  get displayedApps(): any[] {
    switch (this.activeTab) {
      case 'matched':     return this.matchedApps;
      case 'not-matched': return this.notMatchedApps;
      default:            return this.applications;
    }
  }

  get matchedApps(): any[] {
    return this.applications
      .filter(a => (a.matchScore ?? 0) >= 50)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  get notMatchedApps(): any[] {
    return this.applications
      .filter(a => (a.matchScore ?? 0) < 50)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  }

  get bestMatch(): any | null {
    return this.matchedApps.length > 0 ? this.matchedApps[0] : null;
  }

  isBestMatch(app: any): boolean {
    return this.bestMatch?.id === app.id && (app.matchScore ?? 0) >= 50;
  }

  // ─── Accept ──────────────────────────────────────────────────

  acceptApplication(app: any): void {
    this.isAccepting = app.id;
    this.freelancerService.acceptApplication(app.id).subscribe({
      next: () => {
        app.accepted = true;
        app.matchScore = this.computeMatchScore(app);
        this.isAccepting = null;
        this.cdr.detectChanges();
        this.toast.success(`${this.getFullName(app)} has been accepted!`);
      },
      error: () => {
        this.isAccepting = null;
        this.toast.error('Failed to accept application. Please try again.');
      }
    });
  }

  autoAcceptBest(): void {
    const best = this.bestMatch;
    if (!best || best.accepted) return;
    this.isAutoAccepting = true;
    this.freelancerService.acceptApplication(best.id).subscribe({
      next: () => {
        best.accepted = true;
        this.isAutoAccepting = false;
        this.cdr.detectChanges();
        this.toast.success(`🏆 Best match ${this.getFullName(best)} auto-accepted!`);
      },
      error: () => {
        this.isAutoAccepting = false;
        this.toast.error('Auto-accept failed. Please try manually.');
      }
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────

  getFullName(app: any): string {
    const p = app.freelancerProfile;
    if (!p) return 'Loading...';
    return `${p.name || ''} ${p.lastName || ''}`.trim() || 'Unknown';
  }

  getEmail(app: any): string {
    return app.freelancerProfile?.email || '';
  }

  getInitial(app: any): string {
    const name = this.getFullName(app);
    if (name === 'Loading...' || name === 'Unknown') return '?';
    return name.charAt(0).toUpperCase();
  }

  trackById(_: number, item: any): any { return item.id; }

  isSkillMatched(skill: any, app: any): boolean {
    const matched = this.getMatchedSkills(app);
    const name = (skill.skillName || "").toLowerCase();
    return matched.some(m => m === name || m.includes(name) || name.includes(m));
  }

  onClose(): void { this.close.emit(); }
}