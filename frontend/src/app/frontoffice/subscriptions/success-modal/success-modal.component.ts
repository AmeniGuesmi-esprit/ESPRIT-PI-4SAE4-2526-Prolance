import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { trigger, transition, style, animate, keyframes } from '@angular/animations';

@Component({
  selector: 'app-success-modal',
  templateUrl: './success-modal.component.html',
  styleUrls: ['./success-modal.component.scss'],
  animations: [
    trigger('popIn', [
      transition(':enter', [
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', keyframes([
          style({ opacity: 0, transform: 'scale(0.5) translateY(30px)', offset: 0 }),
          style({ opacity: 1, transform: 'scale(1.05) translateY(-5px)', offset: 0.7 }),
          style({ opacity: 1, transform: 'scale(1) translateY(0)', offset: 1 }),
        ]))
      ])
    ]),
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('400ms 300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class SuccessModalComponent implements OnChanges {
  @Input() isVisible = false;
  @Input() planName = '';
  @Input() planTier: 'starter' | 'pro' | 'elite' = 'starter';
  @Input() userType: 'FREELANCER' | 'CLIENT' = 'FREELANCER';

  @Output() closed = new EventEmitter<void>();
  @Output() downloadInvoice = new EventEmitter<void>();

  motivationTitle = '';
  motivationMessage = '';
  motivationTips: string[] = [];
  confettiPieces: { left: string; delay: string; color: string; size: string }[] = [];

  ngOnChanges(): void {
    if (this.isVisible) {
      this.generateMotivation();
      this.generateConfetti();
    }
  }

  private generateMotivation(): void {
    if (this.userType === 'FREELANCER') {
      this.generateFreelancerMotivation();
    } else {
      this.generateClientMotivation();
    }
  }

  private generateFreelancerMotivation(): void {
    const messages: Record<string, { title: string; message: string; tips: string[] }> = {
      starter: {
        title: '🚀 The adventure begins!',
        message: 'You\'ve taken the first step towards freelance success. Every expert started somewhere!',
        tips: [
          '💡 Complete your profile to 100% to attract more clients',
          '📸 Add a professional photo — it boosts trust by 80%',
          '✍️ Send your first proposal today',
          '🎯 Set a goal: 3 proposals this week'
        ]
      },
      pro: {
        title: '⚡ You\'re leveling up!',
        message: 'Pro freelancers land 3x more projects on average. You\'re on the right track!',
        tips: [
          '🌟 Your profile will now be featured in search results',
          '📊 Check your analytics to optimize your proposals',
          '🎯 Pro freelancers have a 2x higher acceptance rate',
          '💬 Use priority support for any questions'
        ]
      },
      elite: {
        title: '👑 Welcome to the elite!',
        message: 'You\'re now part of the top 5% of freelancers. Excellence has no limits!',
        tips: [
          '🏆 You have access to all premium features',
          '📈 Elite members earn 4x more on average',
          '🤝 A dedicated manager supports your success',
          '🚀 Unlimited projects — the world is your playground'
        ]
      }
    };
    const data = messages[this.planTier] || messages['starter'];
    this.motivationTitle = data.title;
    this.motivationMessage = data.message;
    this.motivationTips = data.tips;
  }

  private generateClientMotivation(): void {
    const messages: Record<string, { title: string; message: string; tips: string[] }> = {
      starter: {
        title: '🎯 Ready to find your talent!',
        message: 'You have access to thousands of qualified freelancers. Your next collaborator might already be online!',
        tips: [
          '📝 Post your first job with a clear brief',
          '🔍 Use filters to target the exact skills you need',
          '⭐ Check reviews to choose the best profiles',
          '💰 Set a realistic budget to attract top talent'
        ]
      },
      pro: {
        title: '⚡ Recruitment boosted!',
        message: 'With the Pro plan, your listings are seen by 3x more qualified freelancers!',
        tips: [
          '🤖 AI matching suggests the best profiles for you',
          '📊 Track your recruitments with the analytics dashboard',
          '🎯 Pro clients receive 60% more proposals',
          '💬 Priority support available 24/7'
        ]
      },
      elite: {
        title: '👑 Recruitment excellence!',
        message: 'You now have all the tools to build the perfect team!',
        tips: [
          '🏢 Manage your team with multi-user access',
          '🔗 API access to integrate with your HR tools',
          '🤝 A dedicated manager optimizes your recruitment',
          '♾️ Unlimited listings and proposals'
        ]
      }
    };
    const data = messages[this.planTier] || messages['starter'];
    this.motivationTitle = data.title;
    this.motivationMessage = data.message;
    this.motivationTips = data.tips;
  }

  private generateConfetti(): void {
    const colors = ['#4f46e5', '#06b6d4', '#f59e0b', '#10b981', '#7c3aed', '#ef4444', '#ec4899'];
    this.confettiPieces = Array.from({ length: 30 }, () => ({
      left: Math.random() * 100 + '%',
      delay: Math.random() * 1.5 + 's',
      color: colors[Math.floor(Math.random() * colors.length)],
      size: (Math.random() * 8 + 4) + 'px'
    }));
  }

  onClose(): void {
    this.closed.emit();
  }

  onDownloadInvoice(): void {
    this.downloadInvoice.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('success-overlay')) {
      this.onClose();
    }
  }
}