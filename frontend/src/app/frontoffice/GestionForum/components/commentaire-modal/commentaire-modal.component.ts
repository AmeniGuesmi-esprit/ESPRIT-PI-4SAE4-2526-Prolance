import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { Publication } from '../../models/publication.model';
import { Commentaire } from '../../models/commentaire.model';
import { CommentaireService } from '../../services/commentaire.service';
import { AuthService } from '../../../../services/auth.services';
import { UserSearchService, UserSuggestion } from '../../services/user-search.service';
import { AiContentService } from '../../services/ai-content.service';

// ✅ Structure GIF
interface GifItem {
  url: string;
  preview: string;
  title: string;
}

// ✅ Structure catégorie d'emojis
interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

@Component({
  selector: 'app-commentaire-modal',
  templateUrl: './commentaire-modal.component.html',
  styleUrls: ['./commentaire-modal.component.css']
})
export class CommentaireModalComponent implements OnInit {
  @Input() publication!: Publication;
  @Input() currentUserId!: number;
  @Output() close = new EventEmitter<void>();
  @Output() commentCountChanged = new EventEmitter<number>();

  commentaires: Commentaire[] = [];
  newCommentaire: string = '';

  editingCommentaireId: number | null = null;
  editingContent: string = '';

  replyingToId: number | null = null;
  replyContent: string = '';
  replyingToName: string = '';

  loading: boolean = false;
  errorMessage: string = '';

  // AI Moderation
  private readonly GROQ_API_KEY = '';  // Set your Groq API key here or use environment
  moderating: boolean = false;
  moderatingReply: boolean = false;
  moderatingEdit: boolean = false;
  moderationError: string = '';
  moderationReplyError: string = '';
  moderationEditError: string = '';

  // AI Comment Suggestions
  commentSuggestions: string[] = [];
  loadingSuggestions: boolean = false;
  suggestionsLoaded: boolean = false;
  suggestionsOpen: boolean = false;

  showDeleteModal: boolean = false;
  commentaireToDelete: Commentaire | null = null;

  // @Mention
  mentionSuggestions: UserSuggestion[] = [];
  showMentionDropdown: boolean = false;
  mentionQuery: string = '';
  activeMentionField: 'new' | 'reply' | 'edit' | null = null;
  mentionStartIndex: number = -1;
  private mentionDebounce: any = null;
  dropdownPosition: { top: string; left: string; width: string; maxHeight?: string; bottom?: string } = { top: '0px', left: '0px', width: '220px' };

  // ✅ EMOJI PICKER
  showEmojiPicker: boolean = false;
  activeEmojiField: 'new' | 'reply' | 'edit' | null = null;
  selectedCategory: string = 'Smileys';

  emojiCategories: EmojiCategory[] = [
    {
      name: 'Smileys', icon: '😊',
      emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
               '🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬',
               '🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','💫','🤯','🤠','🥳',
               '🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭',
               '😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺']
    },
    {
      name: 'Gestures', icon: '👋',
      emojis: ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
               '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂',
               '🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄','💋','🩸']
    },
    {
      name: 'Hearts', icon: '❤️',
      emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❤️‍🔥','❤️‍🩹','💔','❣️','💕','💞','💓','💗','💖','💘','💝',
               '💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐']
    },
    {
      name: 'Animals', icon: '🐶',
      emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊',
               '🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗',
               '🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆']
    },
    {
      name: 'Food', icon: '🍕',
      emojis: ['🍕','🍔','🌮','🌯','🍟','🌭','🍿','🧂','🥚','🍳','🧇','🥞','🧈','🍞','🥐','🥖','🫓','🥨','🥯',
               '🧀','🥗','🥙','🥪','🫔','🌮','🫕','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘',
               '🍥','🥮','🍡','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋']
    },
    {
      name: 'Activities', icon: '⚽',
      emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁',
               '🎣','🤿','🎽','🎿','🛷','🥌','🎯','🪀','🪆','🎮','🕹','🎲','🧩','🪅','🎭','🎨','🎬','🎤','🎧','🎼',
               '🎵','🎶','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🪗','🪈']
    },
    {
      name: 'Travel', icon: '✈️',
      emojis: ['✈️','🚀','🛸','🚁','🛶','⛵','🚤','🛥','🛳','⛴','🚢','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊',
               '🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜',
               '🏎','🏍','🛵','🦽','🦼','🛺','🚲','🛴','🛹','🛼','🏋','🛐','⛪','🕌','🕍','⛩','🏔','🗻','🌋','🏕']
    }
  ];

  // ✅ GIF PICKER — GIPHY API
  private readonly GIPHY_API_KEY = 'eZt5wvGwdhhEimbbSHRoUnxAHhLkPcCj';
  showGifPicker: boolean = false;
  activeGifField: 'new' | 'reply' | 'edit' | null = null;
  gifSearchQuery: string = '';
  gifResults: GifItem[] = [];
  gifLoading: boolean = false;
  private gifDebounce: any = null;

  // ✅ Aperçu GIF sélectionné
  selectedGifNew: string | null = null;
  selectedGifReply: string | null = null;
  selectedGifEdit: string | null = null;

  constructor(
    private commentaireService: CommentaireService,
    private authService: AuthService,
    private userSearchService: UserSearchService,
    private aiContentService: AiContentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // ✅ FIX: utiliser getCurrentUser()?.id au lieu de getCurrentUserId()
    const userId = this.authService.getCurrentUser()?.id;
    if (userId) this.currentUserId = userId;

    if (!this.publication || !this.publication.id) {
      this.errorMessage = 'Error: Invalid publication ID';
      return;
    }
    if (!this.currentUserId) {
      this.errorMessage = 'Error: User not logged in';
      return;
    }
    this.loadCommentaires();
    this.loadTrendingGifs();
  }

  // ─────────────────────────────────────────────────
  // ✅ EMOJI METHODS
  // ─────────────────────────────────────────────────

  toggleEmojiPicker(field: 'new' | 'reply' | 'edit'): void {
    if (this.showEmojiPicker && this.activeEmojiField === field) {
      this.showEmojiPicker = false;
      this.activeEmojiField = null;
    } else {
      this.showEmojiPicker = true;
      this.activeEmojiField = field;
      this.showGifPicker = false;
    }
  }

  getEmojisForCategory(categoryName: string): string[] {
    const cat = this.emojiCategories.find(c => c.name === categoryName);
    return cat ? cat.emojis : [];
  }

  insertEmoji(emoji: string, field: 'new' | 'reply' | 'edit'): void {
    if (field === 'new') {
      this.newCommentaire += emoji;
    } else if (field === 'reply') {
      this.replyContent += emoji;
    } else if (field === 'edit') {
      this.editingContent += emoji;
    }
  }

  // ─────────────────────────────────────────────────
  // ✅ GIF METHODS — GIPHY
  // ─────────────────────────────────────────────────

  toggleGifPicker(field: 'new' | 'reply' | 'edit'): void {
    if (this.showGifPicker && this.activeGifField === field) {
      this.showGifPicker = false;
      this.activeGifField = null;
    } else {
      this.showGifPicker = true;
      this.activeGifField = field;
      this.showEmojiPicker = false;
      if (this.gifResults.length === 0) {
        this.loadTrendingGifs();
      }
    }
  }

  loadTrendingGifs(): void {
    this.gifLoading = true;
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${this.GIPHY_API_KEY}&limit=20&rating=g`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        this.gifResults = (data.data || []).map((r: any) => ({
          url: r.images?.original?.url || '',
          preview: r.images?.fixed_width_small?.url || r.images?.original?.url || '',
          title: r.title || ''
        })).filter((g: GifItem) => g.url);
        this.gifLoading = false;
        this.cdr.detectChanges();
      })
      .catch((err) => {
        console.error('GIPHY trending error:', err);
        this.gifResults = [];
        this.gifLoading = false;
        this.cdr.detectChanges();
      });
  }

  searchGifs(): void {
    if (!this.gifSearchQuery.trim()) {
      this.loadTrendingGifs();
      return;
    }
    this.gifLoading = true;
    const query = encodeURIComponent(this.gifSearchQuery.trim());
    const url = `https://api.giphy.com/v1/gifs/search?q=${query}&api_key=${this.GIPHY_API_KEY}&limit=20&rating=g`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        this.gifResults = (data.data || []).map((r: any) => ({
          url: r.images?.original?.url || '',
          preview: r.images?.fixed_width_small?.url || r.images?.original?.url || '',
          title: r.title || ''
        })).filter((g: GifItem) => g.url);
        this.gifLoading = false;
        this.cdr.detectChanges();
      })
      .catch((err) => {
        console.error('GIPHY search error:', err);
        this.gifResults = [];
        this.gifLoading = false;
        this.cdr.detectChanges();
      });
  }

  onGifInput(): void {
    clearTimeout(this.gifDebounce);
    this.gifDebounce = setTimeout(() => {
      this.searchGifs();
    }, 400);
  }

  insertGif(url: string, field: 'new' | 'reply' | 'edit'): void {
    if (field === 'new') {
      this.selectedGifNew = url;
    } else if (field === 'reply') {
      this.selectedGifReply = url;
    } else if (field === 'edit') {
      this.selectedGifEdit = url;
    }
    this.showGifPicker = false;
    this.activeGifField = null;
  }

  removeGif(field: 'new' | 'reply' | 'edit'): void {
    if (field === 'new') this.selectedGifNew = null;
    else if (field === 'reply') this.selectedGifReply = null;
    else if (field === 'edit') this.selectedGifEdit = null;
  }

  extractGifUrl(content: string): string | null {
    if (!content) return null;
    const match = content.match(/\[GIF:(https?:\/\/[^\]]+)\]/);
    return match ? match[1] : null;
  }

  // ─────────────────────────────────────────────────
  // Méthodes existantes
  // ─────────────────────────────────────────────────

  countTotal(comments: any[]): number {
    return comments.reduce((acc, c) => acc + 1 + this.countTotal(c.replies || []), 0);
  }

  loadAndEmit(): void {
    if (!this.publication?.id) return;
    this.loading = true;
    this.commentaireService.getCommentairesByPublicationId(this.publication.id).subscribe({
      next: (data) => {
        this.commentaires = data;
        this.loading = false;
        this.commentCountChanged.emit(this.countTotal(data));
      },
      error: () => { this.loading = false; }
    });
  }

  loadCommentaires(): void {
    if (!this.publication?.id) { this.errorMessage = 'Missing publication ID'; return; }
    this.loading = true;
    this.errorMessage = '';

    this.commentaireService.getCommentairesByPublicationId(this.publication.id).subscribe({
      next: (data) => { this.commentaires = data; this.loading = false; },
      error: (error) => {
        if (error.status === 0) this.errorMessage = 'Unable to reach the server.';
        else if (error.status === 404) this.errorMessage = 'Publication not found.';
        else this.errorMessage = 'Error loading comments.';
        this.loading = false;
      }
    });
  }

  onTextInput(event: Event, field: 'new' | 'reply' | 'edit'): void {
    const textarea = event.target as HTMLTextAreaElement;
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);

    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex === -1) { this.closeMentionDropdown(); return; }

    const queryRaw = textBeforeCursor.substring(atIndex + 1);
    const spaceCount = (queryRaw.match(/ /g) || []).length;

    if (spaceCount > 1) { this.closeMentionDropdown(); return; }

    const query = queryRaw.trim();
    if (spaceCount > 1) { this.closeMentionDropdown(); return; }

    this.activeMentionField = field;
    this.mentionStartIndex = atIndex;
    this.mentionQuery = queryRaw;

    const rect = textarea.getBoundingClientRect();
    const dropdownMaxHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    let top: number;
    if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
      top = rect.bottom + 4;
      this.dropdownPosition = {
        top: top + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        maxHeight: Math.min(dropdownMaxHeight, spaceBelow) + 'px',
        bottom: 'auto'
      };
    } else {
      this.dropdownPosition = {
        top: 'auto',
        bottom: (window.innerHeight - rect.top + 4) + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        maxHeight: Math.min(dropdownMaxHeight, spaceAbove) + 'px'
      };
    }

    clearTimeout(this.mentionDebounce);
    this.mentionDebounce = setTimeout(() => {
      this.userSearchService.searchUsers(query).subscribe({
        next: (users) => {
          this.mentionSuggestions = users.slice(0, 6);
          this.showMentionDropdown = this.mentionSuggestions.length > 0;
          this.cdr.detectChanges();
        },
        error: () => {
          this.showMentionDropdown = false;
          this.cdr.detectChanges();
        }
      });
    }, 200);
  }

  selectMention(user: UserSuggestion): void {
    const mention = `@${user.name} ${user.lastName} `;

    const replaceIn = (text: string): string => {
      const before = text.substring(0, this.mentionStartIndex);
      const after = text.substring(this.mentionStartIndex + 1 + this.mentionQuery.length);
      return before + mention + after;
    };

    if (this.activeMentionField === 'new') this.newCommentaire = replaceIn(this.newCommentaire);
    else if (this.activeMentionField === 'reply') this.replyContent = replaceIn(this.replyContent);
    else if (this.activeMentionField === 'edit') this.editingContent = replaceIn(this.editingContent);

    this.closeMentionDropdown();
  }

  closeMentionDropdown(): void {
    this.showMentionDropdown = false;
    this.mentionSuggestions = [];
    this.activeMentionField = null;
    this.mentionStartIndex = -1;
    this.mentionQuery = '';
    clearTimeout(this.mentionDebounce);
  }

  parseContent(content: string): string {
    if (!content) return '';
    const withoutGif = content.replace(/\[GIF:https?:\/\/[^\]]+\]/g, '').trim();
    return withoutGif.replace(/@([A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?)/g,
      '<span class="mention-tag">@$1</span>');
  }

  // ─────────────────────────────────────────────────
  // ✅ AI COMMENT SUGGESTIONS
  // ─────────────────────────────────────────────────

  loadSuggestions(): void {
    if (this.loadingSuggestions) return;
    if (this.suggestionsLoaded) {
      this.suggestionsOpen = !this.suggestionsOpen;
      if (!this.suggestionsOpen) {
        this.commentSuggestions = [];
      } else {
        this.suggestionsLoaded = false;
        this.loadSuggestions();
      }
      return;
    }
    this.loadingSuggestions = true;
    this.suggestionsOpen = true;
    this.commentSuggestions = [];
    this.aiContentService.generateCommentSuggestions(
      this.publication.titre,
      this.publication.contenue
    ).subscribe({
      next: (suggestions) => {
        this.commentSuggestions = suggestions;
        this.suggestionsLoaded = true;
        this.loadingSuggestions = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingSuggestions = false;
        this.cdr.detectChanges();
      }
    });
  }

  applySuggestion(suggestion: string): void {
    this.newCommentaire = suggestion;
    this.showEmojiPicker = false;
    this.showGifPicker = false;
  }

  private checkContent(text: string): Promise<boolean> {
    const body = {
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `You are a forum moderator. Analyze this comment and reply ONLY with "SAFE" or "UNSAFE".\nA comment is UNSAFE if it contains: insults, profanity, harassment, hate speech, sexual content, threats, spam, or offensive language.\nComment: "${text}"\nResponse (SAFE or UNSAFE only):`
      }],
      max_tokens: 10,
      temperature: 0
    };

    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.GROQ_API_KEY}` },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        const result = data?.choices?.[0]?.message?.content?.trim().toUpperCase() || '';
        return result.includes('SAFE') && !result.includes('UNSAFE');
      })
      .catch(() => true);
  }

  addCommentaire(): void {
    const hasText = this.newCommentaire && this.newCommentaire.trim().length >= 2;
    const hasGif = !!this.selectedGifNew;
    if (!hasText && !hasGif) {
      this.moderationError = 'The comment must contain at least 2 characters.'; return;
    }
    if (!this.publication?.id) { this.errorMessage = 'Error: Missing publication ID'; return; }

    this.showEmojiPicker = false;
    this.showGifPicker = false;

    let finalContent = this.newCommentaire.trim();
    if (this.selectedGifNew) {
      finalContent = finalContent ? finalContent + '\n[GIF:' + this.selectedGifNew + ']' : '[GIF:' + this.selectedGifNew + ']';
    }

    this.moderating = true; this.moderationError = '';
    const textToCheck = finalContent.replace(/\[GIF:https?:\/\/[^\]]+\]/g, '[GIF]').trim();
    this.checkContent(textToCheck || 'GIF').then(isSafe => {
      if (!isSafe) { this.moderating = false; this.moderationError = '🚫 Inappropriate content detected. Please rephrase your comment.'; return; }
      this.loading = true; this.moderating = false;
      this.commentaireService.createCommentaire(finalContent, this.publication.id, this.currentUserId).subscribe({
        next: () => {
          this.newCommentaire = '';
          this.selectedGifNew = null;
          this.commentSuggestions = []; this.suggestionsLoaded = false; this.suggestionsOpen = false;
          this.loadAndEmit();
        },
        error: (e) => { this.errorMessage = e.error || 'Error adding the comment'; this.loading = false; }
      });
    });
  }

  startReply(commentaire: Commentaire): void {
    this.cancelEdit();
    this.replyingToId = commentaire.id!;
    this.replyingToName = `${commentaire.user?.name} ${commentaire.user?.lastName}`;
    this.replyContent = `@${this.replyingToName} `;
    this.moderationReplyError = '';
  }

  cancelReply(): void {
    this.replyingToId = null; this.replyContent = ''; this.replyingToName = '';
    this.moderationReplyError = ''; this.closeMentionDropdown();
    this.showEmojiPicker = false; this.showGifPicker = false;
    this.selectedGifReply = null;
  }

  submitReply(parentCommentaire: Commentaire): void {
    const hasText = this.replyContent && this.replyContent.trim().length >= 2;
    const hasGif = !!this.selectedGifReply;
    if (!hasText && !hasGif) { this.moderationReplyError = 'The reply must contain at least 2 characters.'; return; }
    if (!this.publication?.id) return;

    this.showEmojiPicker = false; this.showGifPicker = false;

    let finalContent = this.replyContent.trim();
    if (this.selectedGifReply) {
      finalContent = finalContent ? finalContent + '\n[GIF:' + this.selectedGifReply + ']' : '[GIF:' + this.selectedGifReply + ']';
    }

    this.moderatingReply = true; this.moderationReplyError = '';
    const textToCheck = finalContent.replace(/\[GIF:https?:\/\/[^\]]+\]/g, '[GIF]').trim();
    this.checkContent(textToCheck || 'GIF').then(isSafe => {
      if (!isSafe) { this.moderatingReply = false; this.moderationReplyError = '🚫 Inappropriate content detected. Please rephrase your reply.'; return; }
      this.loading = true; this.moderatingReply = false;
      this.commentaireService.replyToCommentaire(finalContent, parentCommentaire.id!, this.publication.id, this.currentUserId).subscribe({
        next: () => { this.selectedGifReply = null; this.cancelReply(); this.loadAndEmit(); },
        error: (e) => { this.errorMessage = e.error || 'Error sending the reply'; this.loading = false; }
      });
    });
  }

  startEdit(commentaire: Commentaire): void {
    if (commentaire.user?.id === this.currentUserId) {
      this.cancelReply();
      this.editingCommentaireId = commentaire.id!;

      const gifUrl = this.extractGifUrl(commentaire.contenue);
      if (gifUrl) {
        this.selectedGifEdit = gifUrl;
        this.editingContent = commentaire.contenue
          .replace(/\n?\[GIF:https?:\/\/[^\]]+\]/g, '')
          .trim();
      } else {
        this.selectedGifEdit = null;
        this.editingContent = commentaire.contenue;
      }

      this.moderationEditError = '';
    }
  }

  cancelEdit(): void {
    this.editingCommentaireId = null; this.editingContent = '';
    this.moderationEditError = ''; this.closeMentionDropdown();
    this.showEmojiPicker = false; this.showGifPicker = false;
    this.selectedGifEdit = null;
  }

  saveEdit(commentaire: Commentaire): void {
    const hasText = this.editingContent && this.editingContent.trim().length >= 2;
    const hasGif = !!this.selectedGifEdit;
    if (!hasText && !hasGif) { this.moderationEditError = 'The comment must contain at least 2 characters.'; return; }
    this.showEmojiPicker = false; this.showGifPicker = false;

    let finalContent = this.editingContent.trim();
    if (this.selectedGifEdit) {
      finalContent = finalContent ? finalContent + '\n[GIF:' + this.selectedGifEdit + ']' : '[GIF:' + this.selectedGifEdit + ']';
    }

    this.moderatingEdit = true; this.moderationEditError = '';
    const textToCheck = finalContent.replace(/\[GIF:https?:\/\/[^\]]+\]/g, '[GIF]').trim();
    this.checkContent(textToCheck || 'GIF').then(isSafe => {
      if (!isSafe) { this.moderatingEdit = false; this.moderationEditError = '🚫 Inappropriate content detected. Please rephrase your comment.'; return; }
      this.loading = true; this.moderatingEdit = false;
      this.commentaireService.updateCommentaire(commentaire.id!, finalContent, this.currentUserId).subscribe({
        next: () => { this.selectedGifEdit = null; this.cancelEdit(); this.loadCommentaires(); },
        error: (e) => { this.errorMessage = e.error || 'Error updating the comment'; this.loading = false; }
      });
    });
  }

  deleteCommentaire(commentaire: Commentaire): void {
    if (commentaire.user?.id !== this.currentUserId) return;
    this.commentaireToDelete = commentaire; this.showDeleteModal = true;
  }

  confirmDeleteCommentaire(): void {
    if (!this.commentaireToDelete) return;
    this.commentaireService.deleteCommentaire(this.commentaireToDelete.id!, this.currentUserId).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.commentaireToDelete = null;
        this.loadAndEmit();
      },
      error: () => { this.showDeleteModal = false; this.commentaireToDelete = null; }
    });
  }

  cancelDeleteCommentaire(): void { this.showDeleteModal = false; this.commentaireToDelete = null; }

  canModifyCommentaire(commentaire: Commentaire): boolean { return commentaire.user?.id === this.currentUserId; }

  isPublicationOwner(): boolean {
    return Number(this.publication?.user?.id) === Number(this.currentUserId);
  }

  togglePin(commentaire: Commentaire): void {
    if (!this.isPublicationOwner() || !commentaire.id) return;
    this.commentaireService.togglePin(commentaire.id, this.currentUserId).subscribe({
      next: () => this.loadCommentaires(),
      error: (err) => { console.error('Pin error:', err); }
    });
  }

  getTimeAgo(date: string): string {
    const now = new Date(), d = new Date(date);
    const ms = now.getTime() - d.getTime();
    const mins = Math.floor(ms / 60000), hours = Math.floor(ms / 3600000), days = Math.floor(ms / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  onClose(): void { if (!this.loading) this.close.emit(); }
}