import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { AdsService } from '../../services/ads.service';
import { AdPlacementManagerService } from '../../services/ad-placement-manager.service';
import { AdTrackingService } from '../../services/ad-tracking.service';
import { AdCampaign, RagResponse } from '../../pages/ads/models/ad.models';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0, transform: 'translateY(10px)' })),
      state('*', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('void => *', animate('600ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
      transition('* => void', animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ]),
    trigger('slideVertical', [
      state('void', style({ opacity: 0, transform: 'translateY(20px)' })),
      state('*', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('void => *', animate('700ms cubic-bezier(0.22, 1, 0.36, 1)')),
      transition('* => void', animate('500ms cubic-bezier(0.22, 1, 0.36, 1)'))
    ])
  ]
})
export class LandingComponent implements OnInit, OnDestroy, AfterViewInit {
  navbarTransparent = true;
  currentYear = new Date().getFullYear();
  activeFaq: number = -1;
  activeTestimonial: number = 0;

  testimonials = [
    {
      quote: 'Prolance changed my freelance career. Within a week I landed a $15k project with zero commission taken. The platform is incredibly smooth and professional.',
      name: 'Sarah Chen',
      role: 'Full-Stack Developer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
    },
    {
      quote: 'As a recruiter, finding vetted talent used to take weeks. With Prolance, I posted a job and had five qualified candidates in 48 hours. Absolutely game-changing.',
      name: 'Marcus Rivera',
      role: 'CTO at Finova',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
    },
    {
      quote: 'The fast payment system is the real differentiator. I get paid within a day of milestone approval — no more chasing invoices. Prolance just works.',
      name: 'Amina Okafor',
      role: 'UX Designer',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80'
    }
  ];

  // Ad slots — categorized by planLocation + planType
  landingPageBanners: AdCampaign[] = [];   // Plans 2 & 6: LANDING_PAGE
  gridSpotlights: AdCampaign[] = [];       // Plans 1 & 4: JOB_FEED (non-banner)
  jobFeedBanners: AdCampaign[] = [];       // Plan 5: JOB_FEED + BANNER
  sidebarShowcase: AdCampaign[] = [];      // Plan 3: SEARCH_SIDEBAR
  adsLoading = true;

  // High-conversion ad placements (managed by AdPlacementManager)
  leftSideRailAd: AdCampaign | null = null;   // Type 3: SEARCH_SIDEBAR
  rightSideRailAd: AdCampaign | null = null;  // Type 5: JOB_FEED BANNER
  bottomLeftPopup: AdCampaign | null = null;  // Type 1: Profile Spotlight
  bottomRightPopup: AdCampaign | null = null; // Type 2: Landing Page Banner
  showBottomLeftPopup = false;
  showBottomRightPopup = false;

  private adSubscriptions: Subscription[] = [];

  private observer!: IntersectionObserver;
  private testimonialInterval: any;

  // Tracking state
  private impressionObserver!: IntersectionObserver;
  private impressionTimers = new Map<number, any>();
  private impressedAds = new Set<number>();
  private hoverTimers = new Map<number, any>();

  // RAG Search state
  ragOpen = false;
  ragQuery = '';
  ragLoading = false;
  ragResponse: RagResponse | null = null;
  ragError = false;

  constructor(
    private router: Router,
    private el: ElementRef,
    private adsService: AdsService,
    private adPlacementManager: AdPlacementManagerService,
    private adTrackingService: AdTrackingService
  ) {}

  ngOnInit(): void {
    document.body.classList.add('landing-page');
    this.loadLandingAds();
  }

  private loadLandingAds(): void {
    this.adsService.getActiveAds().subscribe({
      next: (ads) => {
        // Plans 2 & 6 — large horizontal banners between sections
        this.landingPageBanners = ads
          .filter(a => a.planLocation === 'LANDING_PAGE');

        // Plans 1 & 4 — spotlight / featured-job cards in the features grid
        this.gridSpotlights = ads
          .filter(a => a.planLocation === 'JOB_FEED' && a.planType !== 'BANNER');

        // Plan 5 — banner above "Explore Categories"
        this.jobFeedBanners = ads
          .filter(a => a.planLocation === 'JOB_FEED' && a.planType === 'BANNER');

        // Plan 3 — small cards in "Quick Partners" near footer
        this.sidebarShowcase = ads
          .filter(a => a.planLocation === 'SEARCH_SIDEBAR');

        // Initialize Ad Placement Manager with unique placement logic
        const profileSpotlights = ads.filter(a => a.planType === 'FEATURED_PROFILE');
        this.adPlacementManager.initializeSlots(
          this.sidebarShowcase,
          this.jobFeedBanners,
          profileSpotlights,
          this.landingPageBanners
        );

        // Subscribe to slot observables for smooth rotation
        this.subscribeToAdSlots();

        this.adsLoading = false;
        // Re-scan DOM for new .reveal elements after Angular renders the ads
        setTimeout(() => {
          this.initScrollReveal();
          this.initImpressionTracking();
        }, 100);
      },
      error: () => {
        this.landingPageBanners = [];
        this.gridSpotlights = [];
        this.jobFeedBanners = [];
        this.sidebarShowcase = [];
        this.adsLoading = false;
      }
    });
  }

  private subscribeToAdSlots(): void {
    // Left Rail subscription
    this.adSubscriptions.push(
      this.adPlacementManager.leftRail$.subscribe(ad => {
        this.leftSideRailAd = ad;
      })
    );

    // Right Rail subscription
    this.adSubscriptions.push(
      this.adPlacementManager.rightRail$.subscribe(ad => {
        this.rightSideRailAd = ad;
      })
    );

    // Bottom-Left Popup subscription
    this.adSubscriptions.push(
      this.adPlacementManager.bottomLeftPopup$.subscribe(ad => {
        this.bottomLeftPopup = ad;
        if (ad && !this.adPlacementManager.isPopupClosed('bottomLeftPopup')) {
          setTimeout(() => {
            this.showBottomLeftPopup = true;
          }, 3000);
        } else {
          this.showBottomLeftPopup = false;
        }
      })
    );

    // Bottom-Right Popup subscription
    this.adSubscriptions.push(
      this.adPlacementManager.bottomRightPopup$.subscribe(ad => {
        this.bottomRightPopup = ad;
        if (ad && !this.adPlacementManager.isPopupClosed('bottomRightPopup')) {
          setTimeout(() => {
            this.showBottomRightPopup = true;
          }, 3500);
        } else {
          this.showBottomRightPopup = false;
        }
      })
    );
  }

  closeBottomLeftPopup(): void {
    this.showBottomLeftPopup = false;
    this.adPlacementManager.closePopup('bottomLeftPopup');
  }

  closeBottomRightPopup(): void {
    this.showBottomRightPopup = false;
    this.adPlacementManager.closePopup('bottomRightPopup');
  }

  getAdImage(ad: AdCampaign): string {
    if (ad.imageUrl && ad.imageUrl.trim() !== '') {
      return ad.imageUrl;
    }
    return this.getDiceBearUrl(ad);
  }

  hasImage(ad: AdCampaign): boolean {
    return !!(ad.imageUrl && ad.imageUrl.trim() !== '');
  }

  onImgError(event: Event, ad: AdCampaign): void {
    const img = event.target as HTMLImageElement;
    img.src = this.getDiceBearUrl(ad);
  }

  getTitleClass(title: string): string {
    if (!title) return '';
    if (title.length < 20) return 'title-lg';
    if (title.length > 50) return 'title-sm';
    return '';
  }

  private getDiceBearUrl(ad: AdCampaign): string {
    return ad.roleType === 'FREELANCER'
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ad.title)}`
      : `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(ad.title)}`;
  }

  onAdClick(ad: AdCampaign): void {
    // Send Kafka CLICK event (fire-and-forget, no auth redirect)
    this.adTrackingService.sendEvent(ad.id, 'CLICK');
    // Navigation happens via routerLink
  }

  onAdMouseEnter(ad: AdCampaign): void {
    // Start 1.5s hover timer
    const timer = setTimeout(() => {
      this.adTrackingService.sendEvent(ad.id, 'HOVER');
      this.hoverTimers.delete(ad.id);
    }, 1500);
    this.hoverTimers.set(ad.id, timer);
  }

  onAdMouseLeave(ad: AdCampaign): void {
    // Cancel hover timer if mouse leaves before 1.5s
    const timer = this.hoverTimers.get(ad.id);
    if (timer) {
      clearTimeout(timer);
      this.hoverTimers.delete(ad.id);
    }
  }

  // ── RAG Search ────────────────────────────────────

  openRagSearch(): void {
    this.ragOpen = true;
    this.ragQuery = '';
    this.ragResponse = null;
    this.ragError = false;
  }

  closeRagSearch(): void {
    this.ragOpen = false;
    this.ragQuery = '';
    this.ragResponse = null;
    this.ragError = false;
    this.ragLoading = false;
  }

  submitRagQuery(): void {
    if (!this.ragQuery.trim() || this.ragLoading) {
      return;
    }
    this.ragLoading = true;
    this.ragResponse = null;
    this.ragError = false;

    this.adsService.askRag(this.ragQuery.trim()).subscribe({
      next: (res) => {
        this.ragResponse = res;
        this.ragLoading = false;
      },
      error: () => {
        this.ragError = true;
        this.ragLoading = false;
      }
    });
  }

  getScorePercent(score: number): number {
    return Math.round(score * 100);
  }

  ngAfterViewInit(): void {
    this.initScrollReveal();
    this.startTestimonialRotation();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.navbarTransparent = window.scrollY < 80;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  toggleFaq(index: number): void {
    this.activeFaq = this.activeFaq === index ? -1 : index;
  }

  setTestimonial(index: number): void {
    this.activeTestimonial = index;
  }

  private initScrollReveal(): void {
    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '0px 0px -80px 0px',
      threshold: 0.12
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          this.observer.unobserve(entry.target);
        }
      });
    }, options);

    const revealElements = this.el.nativeElement.querySelectorAll('.reveal:not(.visible)');
    revealElements.forEach((el: Element) => this.observer.observe(el));
  }

  private initImpressionTracking(): void {
    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5 // At least 50% visible
    };

    this.impressionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const adId = parseInt(entry.target.getAttribute('data-ad-id') || '0', 10);
        if (!adId || this.impressedAds.has(adId)) return;

        if (entry.isIntersecting) {
          // Start 1s timer for view
          const timer = setTimeout(() => {
            if (!this.impressedAds.has(adId)) {
              this.adTrackingService.sendEvent(adId, 'VIEW');
              this.impressedAds.add(adId);
            }
            this.impressionTimers.delete(adId);
          }, 1000);
          this.impressionTimers.set(adId, timer);
        } else {
          // Cancel timer if ad leaves viewport before 1s
          const timer = this.impressionTimers.get(adId);
          if (timer) {
            clearTimeout(timer);
            this.impressionTimers.delete(adId);
          }
        }
      });
    }, options);

    // Observe all ad elements
    const adElements = this.el.nativeElement.querySelectorAll('[data-ad-id]');
    adElements.forEach((el: Element) => this.impressionObserver.observe(el));
  }

  private startTestimonialRotation(): void {
    this.testimonialInterval = setInterval(() => {
      this.activeTestimonial = (this.activeTestimonial + 1) % this.testimonials.length;
    }, 6000);
  }

  ngOnDestroy(): void {
    this.adSubscriptions.forEach(sub => sub.unsubscribe());
    this.adPlacementManager.cleanup();

    this.impressionTimers.forEach(timer => clearTimeout(timer));
    this.hoverTimers.forEach(timer => clearTimeout(timer));
    this.impressionTimers.clear();
    this.hoverTimers.clear();

    if (this.observer) this.observer.disconnect();
    if (this.impressionObserver) this.impressionObserver.disconnect();
    if (this.testimonialInterval) clearInterval(this.testimonialInterval);
    document.body.classList.remove('landing-page');
  }
}
