import {
  Component, Input, OnInit, OnChanges,
  SimpleChanges, HostListener, ElementRef
} from '@angular/core';
import { ReactionService } from '../../services/reaction.service';
import { ReactionSummaryDTO, ReactorDTO, ReactionType } from '../../models/reaction.model';
import { AuthService } from '../../../../services/auth.services';

interface ReactionOption {
  type:  ReactionType;
  emoji: string;
  label: string;
  color: string;
  img:   string;
}

@Component({
  selector: 'app-reaction-button',
  templateUrl: './reaction-button.component.html',
  styleUrls:  ['./reaction-button.component.css']
})
export class ReactionButtonComponent implements OnInit, OnChanges {
  @Input() publicationId!: number;

  summary: ReactionSummaryDTO = {
    LIKE: 0, DISLIKE: 0, HEART: 0,
    userReaction: null,
    reactors: []
  };

  pickerVisible = false;
  showModal     = false;
  activeFilter: ReactionType | 'ALL' = 'ALL';
  loading = false;
  errorMsg = '';

  private hoverTimer: any = null;
  private userId    = 0;
  private userName  = '';

  readonly options: ReactionOption[] = [
    {
      type: 'LIKE',    emoji: '👍', label: 'Like',
      color: '#1877f2',
      img: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f44d.svg'
    },
    {
      type: 'DISLIKE', emoji: '👎', label: 'Dislike',
      color: '#e5533d',
      img: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f44e.svg'
    },
    {
      type: 'HEART',   emoji: '❤️',  label: 'Love',
      color: '#f33e58',
      img: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2764.svg'
    }
  ];

  constructor(
    private reactionService: ReactionService,
    private authService: AuthService,
    private elRef: ElementRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      // ✅ FIX: utiliser user.id au lieu de user.userId
      this.userId   = user.id;
      this.userName = user.email;
    }
    this.loadSummary();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['publicationId']) this.loadSummary();
  }

  // ── Load summary from backend ─────────────────────────────────
  loadSummary(): void {
    if (!this.publicationId || !this.userId) return;
    this.reactionService.getSummary(this.publicationId, this.userId).subscribe({
      next: (data) => {
        this.summary = data;
        if (!this.summary.userReaction) this.summary.userReaction = null;
      },
      error: (err) => {
        console.error('[ReactionButton] loadSummary error:', err);
      }
    });
  }

  // ── Click main React button ───────────────────────────────────
  onClickMainBtn(): void {
    if (this.summary.userReaction) {
      this.onReact(this.summary.userReaction);
    } else {
      this.pickerVisible = !this.pickerVisible;
    }
  }

  // ── React / toggle off ────────────────────────────────────────
  onReact(type: ReactionType): void {
    if (this.loading) return;
    this.loading  = true;
    this.errorMsg = '';

    const previous = { ...this.summary };
    this.applyOptimistic(type);
    this.pickerVisible = false;

    this.reactionService.toggleReaction(this.publicationId, this.userId, type).subscribe({
      next: () => {
        this.loading = false;
        this.loadSummary();
      },
      error: (err) => {
        console.error('[ReactionButton] toggleReaction error:', err);
        this.loading = false;
        this.summary = previous;
        this.errorMsg = 'Error saving reaction. Please try again.';
        setTimeout(() => { this.errorMsg = ''; }, 3000);
      }
    });
  }

  private applyOptimistic(type: ReactionType): void {
    const prev = this.summary.userReaction;

    if (prev === type) {
      this.summary[type]--;
      this.summary.userReaction = null;
      this.summary.reactors = this.summary.reactors.filter(r => r.userId !== this.userId);
    } else {
      if (prev) {
        this.summary[prev]--;
        this.summary.reactors = this.summary.reactors.filter(r => r.userId !== this.userId);
      }
      this.summary[type]++;
      this.summary.userReaction = type;
      this.summary.reactors.push({ userId: this.userId, userName: this.userName, type });
    }
  }

  // ── Hover picker ──────────────────────────────────────────────
  onHoverEnter(): void {
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => { this.pickerVisible = true; }, 300);
  }

  onHoverLeave(): void {
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => { this.pickerVisible = false; }, 400);
  }

  // ── Modal ─────────────────────────────────────────────────────
  openModal(): void {
    this.activeFilter = 'ALL';
    this.showModal    = true;
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.showModal = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showModal     = false;
    this.pickerVisible = false;
  }

  // ── Getters ───────────────────────────────────────────────────
  get counts() {
    return { LIKE: this.summary.LIKE, DISLIKE: this.summary.DISLIKE, HEART: this.summary.HEART };
  }

  get userReaction(): ReactionType | null { return this.summary.userReaction; }

  get total(): number {
    return (this.summary.LIKE || 0) + (this.summary.DISLIKE || 0) + (this.summary.HEART || 0);
  }

  get reactors(): ReactorDTO[] { return this.summary.reactors || []; }

  get filteredReactors(): ReactorDTO[] {
    if (this.activeFilter === 'ALL') return this.reactors;
    return this.reactors.filter(r => r.type === this.activeFilter);
  }

  getEmoji(type: ReactionType): string {
    return this.options.find(o => o.type === type)?.emoji ?? '👍';
  }

  getEmojiImg(type: ReactionType): string {
    return this.options.find(o => o.type === type)?.img ?? '';
  }

  getLabel(type: ReactionType): string {
    return this.options.find(o => o.type === type)?.label ?? 'React';
  }

  getColor(type: ReactionType): string {
    return this.options.find(o => o.type === type)?.color ?? '#65676b';
  }
}