import { Component, OnInit, HostListener } from '@angular/core';
import { Publication, TypePublication } from '../../models/publication.model';
import { PublicationService, BlockStatus } from '../../services/publication.service';
import { CommentaireService } from '../../services/commentaire.service';
import { AuthService } from '../../../../services/auth.services';
import { UserSearchService, UserSuggestion } from '../../services/user-search.service';

@Component({
  selector: 'app-forum-list',
  templateUrl: './forum-list.component.html',
  styleUrls: ['./forum-list.component.css']
})
export class ForumListComponent implements OnInit {

  publications: Publication[] = [];
  filteredPublications: Publication[] = [];

  selectedType: string = 'TOUS';
  showAddModal = false;
  showEditModal = false;
  showCommentModal = false;
  showDeleteModal = false;
  publicationToDelete: Publication | null = null;
  selectedPublication: Publication | null = null;
  currentUserId: number = 0;
  loading = false;
  errorMessage = '';
  activeMenuId: number | null = null;
  expandedPosts = new Set<number>();
  openReportPanels = new Set<number>();
  usersMap: Map<number, string> = new Map(); // userId → "Prénom Nom"

  toggleReportPanel(id: number): void {
    this.openReportPanels.has(id) ? this.openReportPanels.delete(id) : this.openReportPanels.add(id);
  }

  isReportPanelOpen(id: number): boolean {
    return this.openReportPanels.has(id);
  }

  // ── Blocage utilisateur ───────────────────────────────────────
  isUserBlocked = false;
  archivedCount = 0;

  // ── Modal de signalement ──────────────────────────────────────
  showSignalementModal = false;
  pubToSignal: Publication | null = null;

  // Toast
  toastMessage = '';
  toastIsError = false;
  private toastTimer: any;

  // Lightbox
  lightboxImages: string[] = [];
  lightboxIndex = 0;
  showLightbox = false;

  searchQuery = '';

  // Pagination
  currentPage = 1;
  pageSize = 5;

  get totalPages(): number { return Math.ceil(this.filteredPublications.length / this.pageSize); }
  get paginatedPublications(): Publication[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPublications.slice(start, start + this.pageSize);
  }
  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  prevPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }

  typeOptions = [
    { value: 'TOUS',     label: 'All' },
    { value: 'QUESTION', label: 'Questions' },
    { value: 'ARTICLE',  label: 'Articles' },
    { value: 'REVIEW',   label: 'Reviews' }
  ];

  isExpanded(id: number): boolean { return this.expandedPosts.has(id); }
  toggleExpand(id: number): void {
    this.expandedPosts.has(id) ? this.expandedPosts.delete(id) : this.expandedPosts.add(id);
  }

  constructor(
    private publicationService: PublicationService,
    private commentaireService: CommentaireService,
    private authService: AuthService,
    private userSearchService: UserSearchService
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.actions-right')) this.activeMenuId = null;
  }

  ngOnInit(): void {
    // ✅ FIX: utiliser user.id au lieu de user.userId
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user?.id ?? 0;
      if (this.currentUserId) this.checkBlockStatus();
    });
    // ✅ FIX: utiliser getCurrentUser()?.id au lieu de getCurrentUserId()
    const userId = this.authService.getCurrentUser()?.id;
    if (userId) {
      this.currentUserId = userId;
      this.checkBlockStatus();
    }
    this.loadPublications();
    this.loadUsersMap();
  }

  loadUsersMap(): void {
    this.userSearchService.getAllUsers().subscribe({
      next: (users: UserSuggestion[]) => {
        users.forEach(u => this.usersMap.set(u.id, `${u.name} ${u.lastName}`));
      },
      error: () => {}
    });
  }

  getUserName(userId: number): string {
    return this.usersMap.get(userId) || `User #${userId}`;
  }

  checkBlockStatus(): void {
    if (!this.currentUserId) return;
    this.publicationService.getBlockStatus(this.currentUserId).subscribe({
      next: (status: BlockStatus) => {
        this.isUserBlocked = status.blocked;
        this.archivedCount = status.warningCount;
      },
      error: () => {
        this.isUserBlocked = false;
        this.archivedCount = 0;
      }
    });
  }

  loadPublications(): void {
    this.loading = true;
    this.errorMessage = '';
    this.publicationService.getAllPublications().subscribe({
      next: (data) => {
        this.publications = data;
        this.filterPublications();
        this.loading = false;
        this.loadCommentCounts();
        if (this.currentUserId) this.checkBlockStatus();
      },
      error: () => {
        this.errorMessage = 'Error loading posts';
        this.loading = false;
      }
    });
  }

  loadCommentCounts(): void {
    this.publications.forEach(pub => {
      if (!pub.id) return;
      this.commentaireService.getCommentCountByPublicationId(pub.id).subscribe({
        next: (count) => {
          pub.commentaires = Array(count).fill({});
          const fpub = this.filteredPublications.find(p => p.id === pub.id);
          if (fpub) fpub.commentaires = Array(count).fill({});
        },
        error: () => {}
      });
    });
  }

  filterPublications(): void {
    let result = this.publications;
    if (this.selectedType === 'MYPOSTS') {
      result = result.filter(pub => pub.user?.id === this.currentUserId);
    } else if (this.selectedType !== 'TOUS') {
      result = result.filter(pub => pub.type === this.selectedType);
    }
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(pub => {
        const fullName = `${pub.user?.name ?? ''} ${pub.user?.lastName ?? ''}`.toLowerCase();
        return fullName.includes(q);
      });
    }
    this.filteredPublications = result;
    this.currentPage = 1;
  }

  onTypeChange(type: string): void {
    this.selectedType = type;
    this.filterPublications();
  }

  onSearchChange(): void { this.filterPublications(); }
  clearSearch(): void { this.searchQuery = ''; this.filterPublications(); }

  hasUserSignaled(publication: Publication): boolean {
    return (publication.signalements ?? []).includes(this.currentUserId);
  }

  openSignalementModal(publication: Publication): void {
    if (!publication.id || this.hasUserSignaled(publication)) return;
    this.pubToSignal = publication;
    this.showSignalementModal = true;
  }

  onSignalementCancelled(): void {
    this.showSignalementModal = false;
    this.pubToSignal = null;
  }

  onSignalementReported(updatedPub: Publication): void {
    this.showSignalementModal = false;

    const idx = this.publications.findIndex(p => p.id === updatedPub.id);
    if (idx >= 0) {
      this.publications[idx] = {
        ...this.publications[idx],
        signalements: updatedPub.signalements,
        statut: updatedPub.statut
      };
    }

    if (updatedPub.statut === 'ARCHIVED') {
      this.publications = this.publications.filter(p => p.id !== updatedPub.id);
      this.showToast('⚠️ This post has been archived after 3 reports.', false);
    } else {
      this.showToast('🚩 Post reported successfully.', false);
    }

    this.filterPublications();
    this.pubToSignal = null;
  }

  onSignalementAlreadyReported(): void {
    this.showSignalementModal = false;
    this.pubToSignal = null;
    this.showToast('⚠️ You have already reported this post.', true);
  }

  showToast(message: string, isError: boolean): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage = message;
    this.toastIsError = isError;
    this.toastTimer = setTimeout(() => this.toastMessage = '', 4000);
  }

  openAddModal(): void {
    if (this.isUserBlocked) {
      this.showToast('🚫 Your account is blocked. You cannot create new posts. Contact the admin.', true);
      return;
    }
    this.showAddModal = true;
  }
  closeAddModal(): void { this.showAddModal = false; }

  openEditModal(publication: Publication): void {
    if (publication.user?.id === this.currentUserId) {
      this.selectedPublication = publication;
      this.showEditModal = true;
    }
  }
  closeEditModal(): void { this.showEditModal = false; this.selectedPublication = null; }

  openCommentModal(publication: Publication): void {
    this.selectedPublication = publication;
    this.showCommentModal = true;
  }
  closeCommentModal(): void { this.showCommentModal = false; this.selectedPublication = null; }

  onCommentCountChanged(count: number): void {
    if (!this.selectedPublication) return;
    const arr = Array(count).fill({});
    this.selectedPublication.commentaires = arr;
    const pub = this.publications.find(p => p.id === this.selectedPublication!.id);
    if (pub) pub.commentaires = arr;
    const fpub = this.filteredPublications.find(p => p.id === this.selectedPublication!.id);
    if (fpub) fpub.commentaires = arr;
  }

  onPublicationCreated(): void {
    this.closeAddModal();
    this.loadPublications();
    this.checkBlockStatus();
  }
  onPublicationUpdated(): void { this.closeEditModal(); this.loadPublications(); }

  deletePublication(publication: Publication): void {
    if (publication.user?.id !== this.currentUserId) return;
    this.publicationToDelete = publication;
    this.showDeleteModal = true;
  }
  confirmDelete(): void {
    if (!this.publicationToDelete) return;
    this.publicationService.deletePublication(this.publicationToDelete.id!, this.currentUserId).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.publicationToDelete = null;
        this.loadPublications();
      },
      error: () => { this.showDeleteModal = false; this.publicationToDelete = null; }
    });
  }
  cancelDelete(): void { this.showDeleteModal = false; this.publicationToDelete = null; }

  canModifyPublication(publication: Publication): boolean {
    return publication.user?.id === this.currentUserId;
  }

  toggleActionMenu(publicationId: number): void {
    this.activeMenuId = this.activeMenuId === publicationId ? null : publicationId;
  }
  closeActionMenu(): void { this.activeMenuId = null; }

  getTimeAgo(date: string): string {
    const now = new Date(); const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const mins  = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days  = Math.floor(diffMs / 86400000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins} min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7)   return `${days} days ago`;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  getTypeLabel(type: string): string {
    return ({ QUESTION: 'Question', ARTICLE: 'Article', REVIEW: 'Review' } as any)[type] ?? type;
  }

  getImageUrl(imageName: string): string {
    return `http://localhost:8222/uploads/publications/${imageName}`;
  }
  getPdfUrl(pdfName: string): string {
    return `http://localhost:8222/uploads/publications/${pdfName}`;
  }
  onImageError(event: any): void { event.target.style.display = 'none'; }

  openLightbox(images: string[], index: number): void {
    this.lightboxImages = images; this.lightboxIndex = index; this.showLightbox = true;
  }
  closeLightbox(): void { this.showLightbox = false; }
  lightboxPrev(): void { this.lightboxIndex = (this.lightboxIndex - 1 + this.lightboxImages.length) % this.lightboxImages.length; }
  lightboxNext(): void { this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxImages.length; }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.showLightbox) return;
    if (event.key === 'ArrowLeft')  this.lightboxPrev();
    if (event.key === 'ArrowRight') this.lightboxNext();
    if (event.key === 'Escape')     this.closeLightbox();
  }

  highlightName(fullName: string): string {
    const q = this.searchQuery.trim();
    if (!q) return fullName;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return fullName.replace(regex, '<mark class="search-highlight">$1</mark>');
  }
}