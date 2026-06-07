import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ProjectsService } from '../../services/projects.service';
import { AuthService } from '../../../../services/auth.services';
import { Project } from '../../models/project.model';
import { FreelancerService } from '../../services/freelancer.service';
import { ToastService } from '../../services/toast.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {

  projects: Project[] = [];
  filteredProjects: Project[] = [];
  loading = true;
  errorMessage = '';
  showBlockedAlert = false;

  showAddModal = false;
  showEditModal = false;
  showDetailsModal = false;
  showApplyModal = false;
  showApplicantsModal = false;
  showAiRecommendations = false;
  selectedProject?: Project;

  currentUserRole: string = '';
  currentUserId: number | null = null;
  isClient: boolean = false;
  isFreelancer: boolean = false;
  hasFilledSkills: boolean = false;

  appliedProjectIds: Set<number> = new Set();
  applicationCount: number = 0;
  readonly MAX_APPLICATIONS = 10;

  categoryOptions = [
    { label: 'All', value: 'ALL' },
    { label: 'Dev', value: 'DEV' },
    { label: 'Design', value: 'DESIGN' }
  ];
  selectedCategory = 'ALL';
  viewOptions = [{ label: 'My Projects', value: 'MY_PROJECTS' }];
  selectedView = 'ALL';
  searchQuery = '';

  showSkillsSetupModal = false;
  showDeleteModal = false;
  projectToDelete?: Project;

  constructor(
    private projectsService: ProjectsService,
    private authService: AuthService,
    private freelancerService: FreelancerService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private emailService: EmailNotificationService
  ) {}

  ngOnInit(): void {
    this.determineUserRole();
    this.loadProjects();
    if (this.isFreelancer) {
      this.checkIfSkillsFilled();
      this.loadMyApplications();
    }
  }

  determineUserRole(): void {
  const currentUser = this.authService.getCurrentUser();
  if (currentUser) {
    this.currentUserRole = currentUser.role;
    this.currentUserId = currentUser?.userId ?? (currentUser as any)?.id ?? null;  // ← fix
    this.isClient = this.currentUserRole === 'CLIENT' || this.currentUserRole === 'ADMIN';
    this.isFreelancer = this.currentUserRole === 'FREELANCER';
  }
}

  loadMyApplications(): void {
    if (!this.currentUserId) return;
    this.freelancerService.getFreelancerApplications(this.currentUserId).subscribe({
      next: (apps) => {
        console.log('Applied IDs:', apps);
        this.applicationCount = apps.length;
        this.appliedProjectIds = new Set(
          apps.map((a: any) => a.project?.id ?? a.projectId).filter(Boolean)
        );
      },
      error: () => {}
    });
  }

  hasApplied(project: Project): boolean {
    return !!project.id && this.appliedProjectIds.has(project.id);
  }

  checkIfSkillsFilled(): void {
    if (this.currentUserId) {
      this.freelancerService.getFreelancerSkills(this.currentUserId).subscribe({
        next: (skills) => { this.hasFilledSkills = skills && skills.length > 0; },
        error: () => { this.hasFilledSkills = false; }
      });
    }
  }

  formatStatus(status: string): string {
    return status.replace('_', ' ').toLowerCase();
  }

  formatBudget(budget: number): string {
    return `${budget.toFixed(0)} TND`;
  }

  loadProjects(): void {
    this.loading = true;
    this.projectsService.getAllProjects().subscribe({
      next: (data) => {
        this.projects = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading projects:', err);
        this.errorMessage = 'Impossible de charger les projets.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = this.projects;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.client?.name || '').toLowerCase().includes(q)
      );
    }
    if (this.selectedCategory !== 'ALL') {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }
    if (this.selectedView === 'MY_PROJECTS' && this.isClient && this.currentUserId) {
      filtered = filtered.filter(p => p.client?.id === this.currentUserId);
    }
    this.filteredProjects = filtered;
  }

  isMyProject(project: Project): boolean {
    return this.isClient && project.client?.id === this.currentUserId;
  }

  onSearchChange(query: string): void { this.searchQuery = query; this.applyFilters(); }
  onCategoryChange(category: string): void { this.selectedCategory = category; this.applyFilters(); }
  onViewChange(view: string): void {
    this.selectedView = view;
    if (view === 'MY_PROJECTS') this.selectedCategory = 'ALL';
    this.applyFilters();
  }

  openApplyModal(project: Project): void {
    if (this.hasApplied(project)) {
      this.toast.info('You have already applied to this project.');
      return;
    }
    if (this.applicationCount >= this.MAX_APPLICATIONS) {
      this.toast.warning(`You have reached the maximum of ${this.MAX_APPLICATIONS} applications.`);
      return;
    }
    this.selectedProject = project;
    if (!this.hasFilledSkills) {
      this.showSkillsSetupModal = true;
    } else {
      this.showApplyModal = true;
    }
  }

  closeApplyModal(): void {
    this.showApplyModal = false;
    this.selectedProject = undefined;
  }

  onApplicationSubmitted(): void {
    if (this.selectedProject?.id) {
      this.appliedProjectIds.add(this.selectedProject.id);
      this.applicationCount++;
    }
    this.showApplyModal = false;
    this.selectedProject = undefined;
  }

  closeSkillsSetupModal(): void {
    this.showSkillsSetupModal = false;
    this.selectedProject = undefined;
  }

  onSkillsSetupDone(): void {
    this.hasFilledSkills = true;
    this.showSkillsSetupModal = false;
    this.showApplyModal = true;
  }

  // ─── Add / Edit / Delete ──────────────────────────────────

  openAddModal(): void {
    if (!this.isClient) { this.errorMessage = 'Seuls les clients peuvent créer des projets.'; return; }
    this.showAddModal = true;
  }
  closeAddModal(): void { this.showAddModal = false; this.loadProjects(); }

  openEditModal(project: Project): void {
    if (!this.isMyProject(project)) { this.errorMessage = 'Vous ne pouvez modifier que vos propres projets.'; return; }
    this.selectedProject = project;
    this.showEditModal = true;
  }
  closeEditModal(): void { this.showEditModal = false; this.selectedProject = undefined; this.loadProjects(); }

  openProjectDetails(project: Project): void { this.selectedProject = project; this.showDetailsModal = true; }
  closeDetailsModal(): void { this.showDetailsModal = false; this.selectedProject = undefined; }

  openApplicantsModal(project: Project): void { this.selectedProject = project; this.showApplicantsModal = true; }
  closeApplicantsModal(): void { this.showApplicantsModal = false; this.selectedProject = undefined; }

  openAiRecommendations(): void { this.showAiRecommendations = true; }
  closeAiRecommendations(): void { this.showAiRecommendations = false; }

  openDeleteModal(project: Project): void {
    if (!this.isMyProject(project)) {
      this.errorMessage = 'Vous ne pouvez supprimer que vos propres projets.';
      return;
    }
    this.freelancerService.getApplicationsByProjectId(project.id!).subscribe({
      next: (apps) => {
        if (apps && apps.length > 0) {
          this.showBlockedAlert = true;
        } else {
          this.projectToDelete = project;
          this.showDeleteModal = true;
        }
      },
      error: () => {
        this.projectToDelete = project;
        this.showDeleteModal = true;
      }
    });
  }

  closeDeleteModal(): void { this.showDeleteModal = false; this.projectToDelete = undefined; }

  confirmDelete(): void {
    if (!this.projectToDelete?.id) return;

    const idToDelete    = this.projectToDelete.id;
    const projectTitle  = this.projectToDelete.title;
    const projectBudget = this.projectToDelete.budget;
    const projectCat    = this.projectToDelete.category;
    const clientName    = `${this.projectToDelete.client?.name || ''} ${this.projectToDelete.client?.lastName || ''}`.trim();
    const clientEmail   = this.projectToDelete.client?.email || '';

    this.showDeleteModal = false;
    this.projectToDelete = undefined;
    this.cdr.detectChanges();

    this.projectsService.deleteProject(idToDelete).subscribe({
      next: () => {
        this.emailService.sendDeleteNotification({
          clientName, clientEmail, projectTitle, projectBudget, projectCategory: projectCat
        });
        this.loadProjects();
        this.toast.success('Project deleted successfully.');
      },
      error: (err) => {
        if (err.status === 409) {
          this.showBlockedAlert = true;
          this.cdr.detectChanges();
        } else {
          this.toast.error('An unexpected error occurred. Please try again.');
        }
      }
    });
  }

  closeBlockedAlert(): void { this.showBlockedAlert = false; }
  deleteProject(project: Project): void { this.openDeleteModal(project); }

  getCategoryBadgeClass(category: string): string {
    return { 'DEV': 'category-dev', 'DESIGN': 'category-design' }[category] || 'category-default';
  }
  getCategoryIcon(category: string): string {
    return { 'DEV': '💻', 'DESIGN': '🎨' }[category] || '📌';
  }
}