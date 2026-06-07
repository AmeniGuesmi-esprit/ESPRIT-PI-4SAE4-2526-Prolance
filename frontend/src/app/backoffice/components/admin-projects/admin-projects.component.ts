import { Component, OnInit } from '@angular/core';
import { ProjectsService } from '../../../frontoffice/ProjectModule/services/projects.service';
import { Project } from '../../../frontoffice/ProjectModule/models/project.model';
import { EmailNotificationService } from 'app/frontoffice/ProjectModule/services/email-notification.service';
import { ProjectStatus } from 'app/frontoffice/ProjectModule/models/enums.model';
import { FreelancerService } from 'app/frontoffice/ProjectModule/services/freelancer.service';

@Component({
  selector: 'app-admin-projects',
  templateUrl: './admin-projects.component.html',
  styleUrls: ['./admin-projects.component.scss']
})
export class AdminProjectsComponent implements OnInit {

  projects: Project[] = [];
  filteredProjects: Project[] = [];
  loading = true;
  selectedProject?: Project;
  searchQuery = '';
  statusFilter = 'ALL';
  categoryFilter = 'ALL';

  statusOptions = ['ALL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  categoryOptions = ['ALL', 'DEV', 'DESIGN'];

  approvingProjectId?: number;
constructor(
  private projectsService: ProjectsService,
  private emailService: EmailNotificationService,
  private freelancerService: FreelancerService  // ✅ ajoute ceci
) {}
  // ── Pagination ────────────────────────────────────────────
  currentPage = 1;
  readonly PAGE_SIZE = 5;

  get totalPages(): number {
    return Math.ceil(this.filteredProjects.length / this.PAGE_SIZE);
  }

  get paginatedProjects(): Project[] {
    const start = (this.currentPage - 1) * this.PAGE_SIZE;
    return this.filteredProjects.slice(start, start + this.PAGE_SIZE);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  // ── Modals ────────────────────────────────────────────────
  showSuccessModal = false;
  successModalTitle = '';
  successModalMessage = '';
  successModalEmail = '';

  showConfirmModal = false;
  confirmModalType: 'approve' | 'delete' = 'approve';
  pendingProject?: Project;

 

  ngOnInit(): void {
    this.loadProjects();
  }

  private showSuccess(title: string, message: string, email: string): void {
    this.successModalTitle   = title;
    this.successModalMessage = message;
    this.successModalEmail   = email;
    this.showSuccessModal    = true;
  }

  closeSuccessModal(): void { this.showSuccessModal = false; }

  cancelConfirm(): void {
    this.showConfirmModal = false;
    this.pendingProject = undefined;
  }

  confirmAction(): void {
    this.showConfirmModal = false;
    if (this.confirmModalType === 'approve' && this.pendingProject) {
      this.doApprove(this.pendingProject);
    } else if (this.confirmModalType === 'delete' && this.pendingProject) {
      this.doDelete(this.pendingProject);
    }
    this.pendingProject = undefined;
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
        this.loading = false;
      }
    });
  }

  approveProject(project: Project): void {
    if (!project.id) return;
    this.pendingProject = project;
    this.confirmModalType = 'approve';
    this.showConfirmModal = true;
  }

 private doApprove(project: Project): void {
  if (!project.id) return;
  this.approvingProjectId = project.id;

  this.projectsService.approveProject(project.id).subscribe({
    next: () => {
      const updateStatus = () => {
        if (this.selectedProject?.id === project.id) {
          this.selectedProject!.status = ProjectStatus.COMPLETED;
        }
        const p = this.projects.find(p => p.id === project.id);
        if (p) p.status = ProjectStatus.COMPLETED;
        this.applyFilters();
        this.approvingProjectId = undefined;
      };

      // ✅ Récupérer les applications du projet pour avoir les emails des freelancers
      this.freelancerService.getApplicationsByProjectId(project.id!).subscribe({
        next: (apps) => {
             console.log('APPLICATIONS:', apps); 
          // Envoyer un email à chaque freelancer qui a postulé
          apps.forEach((app: any) => {
            const freelancerEmail = app.freelancer?.email ?? app.freelancerEmail;
            if (freelancerEmail) {
              this.emailService.sendProjectApprovedEmailToFreelancer(
                freelancerEmail,
                project.title,
                project.id!
              ).subscribe({
                next: () => console.log('✅ Email envoyé à', freelancerEmail),
                error: (e) => console.warn('⚠️ Email failed for', freelancerEmail, e)
              });
            }
          });
        },
        error: () => console.warn('⚠️ Could not fetch applications for project', project.id)
      });

      // ✅ Email au client (déjà existant)
      const clientEmail = project.client?.email;
      if (clientEmail) {
        this.emailService.sendProjectApprovedEmail(project.id!, clientEmail, project.title).subscribe({
          next: () => { updateStatus(); this.showSuccess('✅ Projet approuvé !', project.title, clientEmail); },
          error: () => { updateStatus(); this.showSuccess('✅ Projet approuvé !', project.title, ''); }
        });
      } else {
        updateStatus();
        this.showSuccess('✅ Projet approuvé !', project.title, '');
      }
    },
    error: (err) => {
      console.error('Error approving:', err);
      this.approvingProjectId = undefined;
    }
  });
}

  applyFilters(): void {
    let filtered = this.projects;

    if (this.searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.status === this.statusFilter);
    }
    if (this.categoryFilter !== 'ALL') {
      filtered = filtered.filter(p => p.category === this.categoryFilter);
    }

    this.filteredProjects = filtered;
    this.currentPage = 1; // reset to page 1 on filter change
  }

  onSearchChange(query: string): void { this.searchQuery = query; this.applyFilters(); }
  onStatusChange(status: string): void { this.statusFilter = status; this.applyFilters(); }
  onCategoryChange(category: string): void { this.categoryFilter = category; this.applyFilters(); }

  selectProject(project: Project): void { this.selectedProject = project; }
  closeProject(): void { this.selectedProject = undefined; }

  deleteProject(project: Project): void {
    this.pendingProject = project;
    this.confirmModalType = 'delete';
    this.showConfirmModal = true;
  }

  private doDelete(project: Project): void {
    if (!project.id) return;
    this.projectsService.deleteProject(project.id).subscribe({
      next: () => {
        if (this.selectedProject?.id === project.id) this.selectedProject = undefined;
        this.loadProjects();
      },
      error: (err) => console.error('Error deleting:', err)
    });
  }

  getCategoryIcon(category: string): string {
    return { 'DEV': '💻', 'DESIGN': '🎨' }[category] || '📌';
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'IN_PROGRESS': '#f59e0b',
      'COMPLETED': '#10b981',
      'CANCELLED': '#ef4444'
    };
    return colors[status] || '#6b7280';
  }

  getProjectCountByStatus(status: string): number {
    return this.projects.filter(p => p.status === status).length;
  }
}