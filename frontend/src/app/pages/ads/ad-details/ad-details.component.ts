import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdsService } from '../../../services/ads.service';
import { AdCampaign, RoleType } from '../models/ad.models';

const FREELANCER_GRADIENT = 'linear-gradient(135deg, #7B68EE, #6A5ACD)';
const CLIENT_GRADIENT = 'linear-gradient(135deg, #483D8B, #2F2A5C)';
const FREELANCER_PRIMARY = '#7B68EE';
const CLIENT_PRIMARY = '#483D8B';

@Component({
  selector: 'app-ad-details',
  templateUrl: './ad-details.component.html',
  styleUrls: ['./ad-details.component.scss']
})
export class AdDetailsComponent implements OnInit, OnDestroy {
  ad: AdCampaign | null = null;
  isLoading = true;
  error = false;
  adId = 0;

  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adsService: AdsService
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe(params => {
      this.adId = +params['id'];
      if (this.adId) {
        this.loadAdDetails();
      } else {
        this.error = true;
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private loadAdDetails(): void {
    this.isLoading = true;
    this.error = false;

    this.adsService.getAdById(this.adId).subscribe({
      next: (ad) => {
        if (ad.roleType) {
          ad.roleType = (ad.roleType as string).toUpperCase() as RoleType;
        }
        this.ad = ad;
        this.isLoading = false;
      },
      error: () => {
        this.error = true;
        this.isLoading = false;
      }
    });
  }

  getAdImage(): string {
    if (this.ad?.imageUrl?.trim()) {
      return this.ad.imageUrl;
    }
    return this.getFallbackImage();
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.getFallbackImage();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  get roleGradient(): string {
    return this.ad?.roleType === 'FREELANCER' ? FREELANCER_GRADIENT : CLIENT_GRADIENT;
  }

  get rolePrimary(): string {
    return this.ad?.roleType === 'FREELANCER' ? FREELANCER_PRIMARY : CLIENT_PRIMARY;
  }

  private getFallbackImage(): string {
    const seed = encodeURIComponent(this.ad?.title || 'ad');
    return this.ad?.roleType === 'FREELANCER'
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
      : `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;
  }
}
