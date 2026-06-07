import { Component, OnInit } from '@angular/core';
import { ForumService, Publication, Commentaire, ReactionSummary, UserBlockDTO } from './forum.service';

export type DetailPanel = 'pdfs' | 'images' | 'reactions' | 'comments' | null;

@Component({
  selector: 'app-gestion-forum',
  templateUrl: './gestion-forum.component.html',
  styleUrls: ['./gestion-forum.component.css']
})
export class GestionForumComponent implements OnInit {

  today = new Date();

  // ── Tabs admin ────────────────────────────────────────────────────
  activeTab: 'all' | 'blocked' | 'warned' = 'all';

  // ── Toutes les publications ───────────────────────────────────────
  publications: Publication[] = [];
  filteredPublications: Publication[] = [];

  // ── Utilisateurs bloqués ──────────────────────────────────────────
  blockedUsers: UserBlockDTO[] = [];
  loadingBlocked = false;

  // ── Panel détail ──────────────────────────────────────────────────
  selectedPublication: Publication | null = null;
  selectedCommentaires: Commentaire[] = [];
  loadingComments = false;
  reactionSummary: ReactionSummary | null = null;
  loadingReactions = false;
  activePanel: DetailPanel = null;

  expandedCards   = new Set<number>();
  expandedReplies = new Set<number>();

  // ── Filtres ───────────────────────────────────────────────────────
  searchQuery  = '';
  typeFilter   = 'ALL';
  statutFilter = 'ALL';
  typeOptions  = ['ALL', 'QUESTION', 'ARTICLE', 'REVIEW'];

  loading = true;
  error   = '';

  readonly PAGE_SIZE = 3;
  currentPage = 1;

  // ── Delete modal ──────────────────────────────────────────────────
  showDeleteModal = false;
  pubToDelete: Publication | null = null;

  // ── Toast ─────────────────────────────────────────────────────────
  toast = { visible: false, success: true, message: '' };
  private toastTimer: any;

  // ── AI Rapport ────────────────────────────────────────────────────
  private readonly GROQ_API_KEY = '';  // Set your Groq API key here or use environment
  private readonly GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  generatingReport = false;
  showReportModal = false;
  reportText = '';

  generateAiReport(): void {
    this.generatingReport = true;

    const totalPubs= this.publications.filter(p => p.statut === 'ACTIVE').length;
    const questions         = this.publications.filter(p => p.statut === 'ACTIVE' && p.type === 'QUESTION').length;
    const articles          = this.publications.filter(p => p.statut === 'ACTIVE' && p.type === 'ARTICLE').length;
    const reviews           = this.publications.filter(p => p.statut === 'ACTIVE' && p.type === 'REVIEW').length;
    const totalSignalements = this.publications
      .filter(p => p.statut === 'ACTIVE')
      .reduce((acc, p) => acc + (p.signalements?.length || 0), 0);
    const blockedCount = this.blockedUsersCount;
    const warnedCount  = this.warnedUsersCount;

    const prompt = `You are an AI assistant generating an admin report for a developer forum platform.
Here are the current statistics:
- Total publications: ${totalPubs}
- By type: Questions: ${questions}, Articles: ${articles}, Reviews: ${reviews}
- Total reports (signalements): ${totalSignalements}
- Blocked users: ${blockedCount}
- Warned users: ${warnedCount}

Write a concise, professional admin report in French (2–4 paragraphs) that:
1. Summarizes the forum activity
2. Highlights moderation issues (reports, blocks, warnings)
3. Gives 2–3 actionable recommendations for the admin
Keep it factual, clear and actionable. No bullet points, write in prose.`;

    fetch(this.GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.6
      })
    })
      .then(r => r.json())
      .then(data => {
        this.reportText = data?.choices?.[0]?.message?.content?.trim() || 'Erreur lors de la génération du rapport.';
        this.showReportModal = true;
        this.generatingReport = false;
      })
      .catch(() => {
        this.reportText = 'Erreur réseau lors de la génération du rapport.';
        this.showReportModal = true;
        this.generatingReport = false;
      });
  }

  closeReportModal(): void {
    this.showReportModal = false;
    this.reportText = '';
  }

  downloadReport(): void {
    const loadJsPDF = (): Promise<any> => {
      if ((window as any).jspdf?.jsPDF) return Promise.resolve((window as any).jspdf.jsPDF);
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve((window as any).jspdf.jsPDF);
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    loadJsPDF().then(JsPDF => {
      const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const date = new Date().toLocaleDateString('fr-FR');
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 18;
      const contentW = pageW - margin * 2;

      // ── Header band ──
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 0, pageW, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Rapport AI — Forum Management', margin, 15);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Généré le : ${date}`, margin, 24);

      // ── Stats band ──
      const totalPubs = this.publications.length;
      const activePubs = this.publications.filter(p => p.statut === 'ACTIVE').length;
      const archivedPubs = this.publications.filter(p => p.statut === 'ARCHIVED').length;
      const totalSig = this.publications.reduce((a, p) => a + (p.signalements?.length || 0), 0);

      const stats = [
        { label: 'Publications actives', value: String(activePubs) },
        { label: 'Archivées', value: String(archivedPubs) },
        { label: 'Signalements', value: String(totalSig) },
        { label: 'Bloqués', value: String(this.blockedUsersCount) },
        { label: 'Avertis', value: String(this.warnedUsersCount) },
      ];

      const boxW = (contentW - 4 * 4) / 5;
      let bx = margin;
      const bY = 38;
      doc.setFontSize(8);
      stats.forEach(s => {
        doc.setFillColor(243, 240, 255);
        doc.roundedRect(bx, bY, boxW, 18, 3, 3, 'F');
        doc.setTextColor(124, 58, 237);
        doc.setFont('helvetica', 'bold');
        doc.text(s.value, bx + boxW / 2, bY + 7, { align: 'center' });
        doc.setTextColor(80, 60, 120);
        doc.setFont('helvetica', 'normal');
        doc.text(s.label, bx + boxW / 2, bY + 13, { align: 'center' });
        bx += boxW + 4;
      });

      // ── Divider ──
      let curY = bY + 26;
      doc.setDrawColor(200, 180, 255);
      doc.setLineWidth(0.4);
      doc.line(margin, curY, pageW - margin, curY);
      curY += 7;

      // ── Report body ──
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 60);
      const lines: string[] = doc.splitTextToSize(this.reportText, contentW);
      const lineH = 6;
      const pageH = doc.internal.pageSize.getHeight();
      const bottomMargin = 22;

      lines.forEach((line: string) => {
        if (curY + lineH > pageH - bottomMargin) {
          doc.addPage();
          curY = margin;
        }
        doc.text(line, margin, curY);
        curY += lineH;
      });

      // ── Footer on each page ──
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(248, 245, 255);
        doc.rect(0, pageH - 14, pageW, 14, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(150, 130, 190);
        doc.text('Forum Management — Rapport IA confidentiel', margin, pageH - 5);
        doc.text(`Page ${i} / ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' });
      }

      doc.save(`rapport-forum-${new Date().toISOString().slice(0, 10)}.pdf`);
    });
  }

  constructor(private forumService: ForumService) {}

  ngOnInit(): void {
    this.loadData();
    this.loadBlockedUsers();
  }

  // ── Chargement ────────────────────────────────────────────────────

  loadData(): void {
    this.loading = true;
    this.error   = '';
    this.forumService.getAllPublications().subscribe({
      next: (pubs) => {
        this.publications = pubs;
        this.applyFilters();
        this.loading = false;
        this.loadAllCommentCounts();
      },
      error: () => { this.error = 'Error loading publications.'; this.loading = false; }
    });
  }

  loadBlockedUsers(): void {
    this.loadingBlocked = true;
    this.forumService.getBlockedUsers().subscribe({
      next:  (users) => { this.blockedUsers = users; this.loadingBlocked = false; },
      error: ()      => { this.blockedUsers = [];    this.loadingBlocked = false; }
    });
  }

  loadAllCommentCounts(): void {
    this.publications.forEach(pub => {
      this.forumService.getCommentCountByPublication(pub.id).subscribe({
        next: (count) => {
          pub.commentCount = count;
          const fpub = this.filteredPublications.find(p => p.id === pub.id);
          if (fpub) fpub.commentCount = count;
        },
        error: () => {}
      });
    });
  }

  // ── Navigation tabs ───────────────────────────────────────────────

  switchTab(tab: 'all' | 'blocked' | 'warned'): void {
    this.activeTab = tab;
    if (tab === 'blocked' || tab === 'warned') this.loadBlockedUsers();
  }

  // ── Filtres ───────────────────────────────────────────────────────

  applyFilters(): void {
    let result = this.publications;

    if (this.statutFilter === 'ARCHIVED') {
      result = result.filter(p => p.statut === 'ARCHIVED');
    } else {
      result = result.filter(p => p.statut === 'ACTIVE');
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p => this.getUserLabel(p.user).toLowerCase().includes(q));
    }
    if (this.typeFilter !== 'ALL') {
      result = result.filter(p => p.type === this.typeFilter);
    }

    this.filteredPublications = result;
    this.currentPage = 1;
  }

  onSearchChange(q: string): void { this.searchQuery = q; this.applyFilters(); }
  onTypeChange(type: string): void {
    this.typeFilter = type;
    if (type === 'ALL') this.statutFilter = 'ALL';
    this.applyFilters();
  }
  onStatutChange(statut: string): void {
    this.statutFilter = this.statutFilter === statut ? 'ALL' : statut;
    this.applyFilters();
  }
  clearFilters(): void { this.searchQuery = ''; this.typeFilter = 'ALL'; this.statutFilter = 'ALL'; this.applyFilters(); }

  // ── Pagination ────────────────────────────────────────────────────

  get totalPages(): number { return Math.ceil(this.filteredPublications.length / this.PAGE_SIZE); }
  get pagedPublications(): Publication[] {
    const start = (this.currentPage - 1) * this.PAGE_SIZE;
    return this.filteredPublications.slice(start, start + this.PAGE_SIZE);
  }
  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages) this.currentPage = p; }

  // ── Expand cards / replies ────────────────────────────────────────

  isExpanded(id: number): boolean { return this.expandedCards.has(id); }
  toggleExpand(id: number, event: Event): void {
    event.stopPropagation();
    this.expandedCards.has(id) ? this.expandedCards.delete(id) : this.expandedCards.add(id);
  }
  toggleReplies(commentId: number): void {
    this.expandedReplies.has(commentId) ? this.expandedReplies.delete(commentId) : this.expandedReplies.add(commentId);
  }
  isRepliesExpanded(commentId: number): boolean { return this.expandedReplies.has(commentId); }

  // ── Panel ─────────────────────────────────────────────────────────

  openPanel(pub: Publication, panel: DetailPanel, event: Event): void {
    event.stopPropagation();
    if (this.selectedPublication?.id === pub.id && this.activePanel === panel) {
      this.activePanel = null;
      return;
    }
    this.selectedPublication = pub;
    this.activePanel = panel;
    if (panel === 'comments')  this.loadComments(pub);
    if (panel === 'reactions') this.loadReactions(pub);
  }

  closePanel(): void {
    this.selectedPublication = null;
    this.activePanel = null;
    this.expandedReplies.clear();
  }

  loadComments(pub: Publication): void {
    this.loadingComments = true;
    this.selectedCommentaires = [];
    this.expandedReplies.clear();
    this.forumService.getCommentairesByPublication(pub.id).subscribe({
      next: (comments) => {
        this.selectedCommentaires = comments;
        pub.commentCount = this.countTotal(comments);
        const fpub = this.filteredPublications.find(p => p.id === pub.id);
        if (fpub) fpub.commentCount = pub.commentCount;
        this.loadingComments = false;
      },
      error: () => { this.loadingComments = false; }
    });
  }

  countTotal(comments: Commentaire[]): number {
    return comments.reduce((acc, c) => acc + 1 + this.countTotal(c.replies || []), 0);
  }
  get totalCommentsDisplayed(): number { return this.countTotal(this.selectedCommentaires); }

  loadReactions(pub: Publication): void {
    this.loadingReactions = true;
    this.forumService.getReactionSummary(pub.id).subscribe({
      next:  (s) => { this.reactionSummary = s; this.loadingReactions = false; },
      error: ()  => {
        this.reactionSummary = { LIKE: 0, DISLIKE: 0, HEART: 0, userReaction: null, reactors: [] };
        this.loadingReactions = false;
      }
    });
  }

  // ── Réactivation compte utilisateur (admin) ───────────────────────

  reactiverCompteUser(user: UserBlockDTO): void {
    this.forumService.reactiverCompteUser(user.userId).subscribe({
      next: () => {
        // Les posts archivés ont été supprimés côté back — on recharge tout
        this.loadData();
        this.loadBlockedUsers();
        this.showToast(
          true,
          `Compte de ${user.name} ${user.lastName} réactivé. Posts archivés supprimés.`
        );
      },
      error: () => this.showToast(false, `Erreur lors de la réactivation du compte de ${user.name} ${user.lastName}.`)
    });
  }

  // ── Suppression ───────────────────────────────────────────────────

  askDelete(pub: Publication, event: Event): void {
    event.stopPropagation();
    this.pubToDelete    = pub;
    this.showDeleteModal = true;
  }
  cancelDelete(): void { this.showDeleteModal = false; this.pubToDelete = null; }
  confirmDelete(): void {
    if (!this.pubToDelete) return;
    const pub = this.pubToDelete;
    this.showDeleteModal = false;
    this.pubToDelete    = null;
    this.forumService.adminDeletePublication(pub.id).subscribe({
      next: () => {
        if (this.selectedPublication?.id === pub.id) this.closePanel();
        this.loadData();
        this.showToast(true, `"${pub.titre}" deleted successfully.`);
      },
      error: () => this.showToast(false, `Failed to delete "${pub.titre}".`)
    });
  }

  // ── Toast ─────────────────────────────────────────────────────────

  showToast(success: boolean, message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { visible: true, success, message };
    this.toastTimer = setTimeout(() => this.toast = { ...this.toast, visible: false }, 4000);
  }
  closeToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { ...this.toast, visible: false };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  get totalReactions(): number {
    if (!this.reactionSummary) return 0;
    return (this.reactionSummary.LIKE || 0) + (this.reactionSummary.DISLIKE || 0) + (this.reactionSummary.HEART || 0);
  }

  getCountByType(type: string): number {
    return this.publications.filter(p => p.type === type && p.statut === 'ACTIVE').length;
  }
  getCountByStatut(statut: string): number {
    return this.publications.filter(p => p.statut === statut).length;
  }
  get activePublicationsCount(): number {
    return this.publications.filter(p => p.statut === 'ACTIVE').length;
  }
  pct(type: string): string {
    const activeCount = this.activePublicationsCount;
    return activeCount > 0 ? ((this.getCountByType(type) / activeCount) * 100).toFixed(0) : '0';
  }

  /** Nombre d'utilisateurs actuellement bloqués (>= 3 posts archivés) */
  get blockedUsersCount(): number {
    return this.blockedUsers.filter(u => u.blocked).length;
  }

  /**
   * Utilisateurs avertis :
   * basé sur le nombre de leurs publications ARCHIVED dans this.publications (feed admin complet).
   * Seulement ceux ayant 1 ou 2 posts archivés (non bloqués).
   */
  get warnedUsersFromPublications(): { userId: number; name: string; lastName: string; warningCount: number; posts: Publication[] }[] {
    const map = new Map<number, { userId: number; name: string; lastName: string; warningCount: number; posts: Publication[] }>();

    for (const pub of this.publications) {
      if (pub.statut !== 'ARCHIVED') continue;
      const u = pub.user;
      if (!u) continue;

      // Exclure les utilisateurs bloqués (ils ont leur propre tab)
      const isBlocked = this.blockedUsers.some(b => b.userId === u.id && b.blocked);
      if (isBlocked) continue;

      if (!map.has(u.id)) {
        map.set(u.id, { userId: u.id, name: u.name, lastName: u.lastName, warningCount: 0, posts: [] });
      }
      const entry = map.get(u.id)!;
      entry.warningCount += 1;
      entry.posts.push(pub);
    }

    // Seulement ceux avec 1 ou 2 posts archivés
    return Array.from(map.values()).filter(u => u.warningCount === 1 || u.warningCount === 2);
  }

  /** Nombre d'utilisateurs avertis (1 ou 2 posts archivés, non bloqués) */
  get warnedUsersCount(): number {
    return this.warnedUsersFromPublications.length;
  }

  getTypeIcon(type: string): string  { return ({ QUESTION: '❓', ARTICLE: '📰', REVIEW: '⭐' } as any)[type] || '📝'; }
  getTypeColor(type: string): string { return ({ QUESTION: '#3b82f6', ARTICLE: '#a855f7', REVIEW: '#f59e0b' } as any)[type] || '#6b7280'; }
  getTypeBg(type: string): string    { return ({ QUESTION: 'rgba(59,130,246,0.14)', ARTICLE: 'rgba(168,85,247,0.14)', REVIEW: 'rgba(245,158,11,0.14)' } as any)[type] || 'rgba(107,114,128,0.14)'; }
  getPdfUrl(pdf: string): string     { return `http://localhost:8222/uploads/publications/${pdf}`; }
  getImageUrl(img: string): string   { return `http://localhost:8222/uploads/publications/${img}`; }
  getPdfName(pdf: string): string    { const idx = pdf.indexOf('_'); return idx >= 0 ? pdf.substring(idx + 1) : pdf; }
  getUserLabel(user: any): string {
    if (!user) return 'N/A';
    const full = [user.name, user.lastName].filter(Boolean).join(' ').trim();
    return full || user.email || 'N/A';
  }
  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  getInitials(user: any): string {
    if (!user) return '?';
    return [(user.name || '').charAt(0), (user.lastName || '').charAt(0)].join('').toUpperCase() || '?';
  }

  /** Extrait l'URL du GIF depuis le format [GIF:url] */
  extractGifUrl(content: string): string | null {
    if (!content) return null;
    const match = content.match(/\[GIF:(https?:\/\/[^\]]+)\]/);
    return match ? match[1] : null;
  }

  /** Retourne le texte du commentaire sans la balise [GIF:...] */
  parseCommentContent(content: string): string {
    if (!content) return '';
    return content.replace(/\[GIF:https?:\/\/[^\]]+\]/g, '').trim();
  }
}