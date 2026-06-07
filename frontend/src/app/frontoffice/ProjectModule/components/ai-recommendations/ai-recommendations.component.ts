import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Project } from '../../models/project.model';
import { FreelancerService } from '../../services/freelancer.service';
import { ProjectsService } from '../../services/projects.service';

export interface AiRecommendation {
  project: Project;
  score: number;
  reason: string;
  matchedSkills: string[];
}

export interface SkillGap {
  skill: string;
  projectCount: number;
  category: string;
  avgBudget: number;
  priority: 'high' | 'medium' | 'low';
}
// Same icon map as freelancer-skills-setup
const SKILL_ICONS: Record<string, string> = {
  angular:    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angular/angular-original.svg",
  react:      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg",
  vue:        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg",
  javascript: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
  typescript: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
  python:     "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
  java:       "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
  nodejs:     "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg",
  node:       "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg",
  spring:     "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg",
  docker:     "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg",
  mysql:      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg",
  mongodb:    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg",
  figma:      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
  git:        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg",
  css:        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg",
  html:       "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg",
  php:        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg",
  flutter:    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg",
  kotlin:     "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg",
  swift:      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg",
  aws:        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg",
  laravel:    "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-plain.svg",
  photoshop:  "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/photoshop/photoshop-plain.svg",
  illustrator:"https://cdn.jsdelivr.net/gh/devicons/devicon/icons/illustrator/illustrator-plain.svg",
  xd:         "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/xd/xd-plain.svg",
};
@Component({
  selector: 'app-ai-recommendations',
  templateUrl: './ai-recommendations.component.html',
  styleUrls: ['./ai-recommendations.component.scss']
})


export class AiRecommendationsComponent implements OnInit {

  @Input() freelancerId!: number;
  @Input() appliedProjectIds: Set<number> = new Set();
  @Output() close = new EventEmitter<void>();
  @Output() applyProject = new EventEmitter<Project>();

  recommendations: AiRecommendation[] = [];
  skillGaps: SkillGap[] = [];
  freelancerSkills: any[] = [];
  allProjects: Project[] = [];
  loading = false;
  error = '';
  activeTab: 'recommendations' | 'gaps' = 'recommendations';

  // How many projects exist total (for context)
  totalProjects = 0;
  // Projects already matchable without new skills
  alreadyMatchable = 0;

  private readonly SKILL_GROUPS: { keywords: string[]; skills: string[]; label: string }[] = [
    { label: 'Backend',
      keywords: ['backend', 'server', 'api', 'rest', 'microservice', 'database', 'base de données', 'données', 'sql', 'spring', 'node', 'web', 'application'],
      skills: ['java', 'spring', 'spring boot', 'node', 'nodejs', 'python', 'django', 'php', 'laravel', 'sql', 'mysql', 'postgresql', 'mongodb', 'express', 'hibernate'] },
    { label: 'Frontend',
      keywords: ['frontend', 'interface', 'ui', 'web', 'application', 'app', 'site', 'page', 'utilisateur', 'user', 'interactive', 'dashboard'],
      skills: ['angular', 'react', 'vue', 'typescript', 'javascript', 'html', 'css', 'sass', 'tailwind', 'bootstrap'] },
    { label: 'Mobile',
      keywords: ['mobile', 'android', 'ios', 'app mobile', 'application mobile'],
      skills: ['flutter', 'react native', 'kotlin', 'swift', 'android', 'ios', 'dart'] },
    { label: 'Design',
      keywords: ['design', 'graphique', 'graphic', 'logo', 'branding', 'visual', 'visuel', 'maquette', 'prototype', 'ui', 'ux'],
      skills: ['figma', 'photoshop', 'illustrator', 'sketch', 'xd', 'canva', 'indesign', 'ui', 'ux'] },
    { label: 'Data / AI',
      keywords: ['data', 'machine learning', 'ai', 'intelligence artificielle', 'analyse', 'analysis', 'model', 'prediction'],
      skills: ['python', 'tensorflow', 'pytorch', 'scikit', 'pandas', 'numpy', 'r', 'spark', 'machine learning'] },
    { label: 'DevOps',
      keywords: ['deploy', 'déploiement', 'cloud', 'infrastructure', 'devops', 'ci/cd', 'docker', 'kubernetes'],
      skills: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'gitlab', 'terraform', 'linux'] },
  ];

  constructor(
    private freelancerService: FreelancerService,
    private projectsService: ProjectsService
  ) {}

  ngOnInit(): void { this.loadRecommendations(); }

  async loadRecommendations(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.recommendations = [];
    this.skillGaps = [];

    try {
      const [skills, projects] = await Promise.all([
        this.freelancerService.getFreelancerSkills(this.freelancerId).toPromise(),
        this.projectsService.getAllProjects().toPromise()
      ]);

      this.freelancerSkills = skills || [];
      this.allProjects = projects || [];
      this.totalProjects = this.allProjects.length;

      if (this.freelancerSkills.length === 0) {
        this.error = 'Please add skills to your profile first to get recommendations.';
        this.loading = false;
        return;
      }

      const available = this.allProjects.filter(p => !this.appliedProjectIds.has(p.id!));

      // Score & recommend
      const scored = available
        .map(p => this.scoreProject(p))
        .filter(r => r.score >= 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      this.recommendations = scored;
      this.alreadyMatchable = scored.length;

      // Skill gaps
      this.skillGaps = this.computeSkillGaps(this.allProjects);

    } catch (e) {
      this.error = 'Failed to load recommendations. Please try again.';
    }

    this.loading = false;
  }

  // ─── Skill Gap ───────────────────────────────────────────────

  private computeSkillGaps(allProjects: Project[]): SkillGap[] {
    const mySkills: string[] = this.freelancerSkills
      .map((s: any) => (s.skillName || '').toLowerCase().trim());

    // For each project, find which single skill would make ME match it
    // but I currently don't have
    const skillUnlocks = new Map<string, Set<number>>(); // skill → set of project IDs it unlocks

    for (const project of allProjects) {
      const projectText = `${project.title} ${project.description} ${project.category}`.toLowerCase();
      const currentScore = this.scoreProject(project).score;

      // Only care about projects I don't already match well
      if (currentScore >= 60) continue;

      for (const group of this.SKILL_GROUPS) {
        if (!group.keywords.some(kw => projectText.includes(kw))) continue;

        for (const groupSkill of group.skills) {
          // Skip if I already have it
          const alreadyHas = mySkills.some(ms =>
            ms === groupSkill || ms.includes(groupSkill) || groupSkill.includes(ms)
          );
          if (alreadyHas) continue;

          if (!skillUnlocks.has(groupSkill)) skillUnlocks.set(groupSkill, new Set());
          skillUnlocks.get(groupSkill)!.add(project.id!);
        }
      }
    }

    // Remove skills that unlock the exact same set as a higher-ranked skill
    // (keep only the most representative from each overlapping group)
    const seen = new Set<string>(); // fingerprint of project sets
    const gaps: SkillGap[] = [];

    const sorted = [...skillUnlocks.entries()]
      .sort((a, b) => b[1].size - a[1].size);

    for (const [skill, projectSet] of sorted) {
      if (projectSet.size < 1) continue;

      // Create fingerprint
      const fp = [...projectSet].sort().join(',');

      // Skip if this exact same set was already represented
      if (seen.has(fp)) continue;
      seen.add(fp);

      const unlocked = allProjects.filter(p => projectSet.has(p.id!));
      const avgBudget = Math.round(
        unlocked.reduce((s, p) => s + (p.budget || 0), 0) / unlocked.length
      );
      const catCount: Record<string, number> = {};
      unlocked.forEach(p => { catCount[p.category] = (catCount[p.category] || 0) + 1; });
      const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      const priority: 'high' | 'medium' | 'low' =
        projectSet.size >= 5 ? 'high' :
        projectSet.size >= 3 ? 'medium' : 'low';

      gaps.push({ skill, projectCount: projectSet.size, category: topCat, avgBudget, priority });
    }

    return gaps.slice(0, 8);
  }

  // ─── Scoring ─────────────────────────────────────────────────

  private scoreProject(project: Project): AiRecommendation {
    const projectText = `${project.title} ${project.description} ${project.category}`.toLowerCase();
    const mySkills: string[] = this.freelancerSkills
      .map((s: any) => (s.skillName || '').toLowerCase().trim())
      .filter(s => s.length > 0);

    let totalScore = 0, maxPossible = 0;
    const matched: string[] = [];

    for (const group of this.SKILL_GROUPS) {
      if (!group.keywords.some(kw => projectText.includes(kw))) continue;
      maxPossible += 100;
      const gm = mySkills.filter(fs => group.skills.some(gs => gs === fs || gs.includes(fs) || fs.includes(gs)));
      if (gm.length > 0) {
        totalScore += 100 * Math.min(gm.length, 3) / 3;
        gm.forEach(s => { if (!matched.includes(s)) matched.push(s); });
      }
    }

    let score = maxPossible > 0 ? (totalScore / maxPossible) * 75 : 15;
    const avgYears = this.freelancerSkills.reduce((s: number, sk: any) => s + (sk.yearsExperience || 0), 0)
      / Math.max(this.freelancerSkills.length, 1);
    score += Math.min(avgYears * 1.5, 15);
    if (this.freelancerSkills.some((s: any) => s.level === 'EXPERT')) score += 10;
    else if (this.freelancerSkills.some((s: any) => s.level === 'INTERMEDIATE')) score += 5;

    const finalScore = Math.min(Math.round(score), 100);
    return { project, score: finalScore, reason: this.buildReason(project, matched, finalScore), matchedSkills: matched };
  }

  private buildReason(project: Project, matched: string[], score: number): string {
    if (matched.length === 0) return `Your profile's category aligns with this ${project.category} project.`;
    const top = matched.slice(0, 3).join(', ');
    if (score >= 70) return `Strong match — your ${top} skills are highly relevant to this project.`;
    if (score >= 50) return `Good fit — your ${top} experience matches this project's needs.`;
    return `Partial match — your ${top} skills could be useful here.`;
  }

  // ─── Template helpers ─────────────────────────────────────────

  getMaxGapCount(): number {
    return this.skillGaps[0]?.projectCount || 1;
  }

  getPriorityLabel(p: 'high' | 'medium' | 'low'): string {
    return { high: '🔥 High impact', medium: '⚡ Medium impact', low: '📌 Low impact' }[p];
  }

  isApplied(project: Project): boolean {
    return !!project.id && this.appliedProjectIds.has(project.id);
  }

  applyToProject(project: Project): void {
    this.applyProject.emit(project);
    this.onClose();
  }

  getScoreColor(score: number): string {
    if (score >= 70) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#a78bfa';
  }

  getCircumference(score: number): string {
    const r = 15.9, c = 2 * Math.PI * r;
    return `${((score / 100) * c).toFixed(1)} ${c.toFixed(1)}`;
  }

  getCategoryIcon(cat: string): string {
    return { 'DEV': '💻', 'DESIGN': '🎨' }[cat] || '📌';
  }

  formatBudget(b: number): string {
    return b >= 1000 ? `${(b / 1000).toFixed(0)}k TND` : `${b} TND`;
  }

  getSkillIcon(name: string): string | null {
    return SKILL_ICONS[(name || "").toLowerCase().trim()] || null;
  }

  getInitial(name: string): string {
    return (name || "?").charAt(0).toUpperCase();
  }

  setTab(tab: "recommendations" | "gaps"): void { this.activeTab = tab; }
  onClose(): void { this.close.emit(); }
}