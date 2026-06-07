import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { AdCampaign } from '../pages/ads/models/ad.models';

export interface AdSlot {
  slotId: string;
  currentAd: AdCampaign | null;
  availableAds: AdCampaign[];
  currentIndex: number;
  rotationEnabled: boolean;
}

const CLOSED_POPUPS_KEY = 'closedAdPopups';
const ROTATION_INTERVAL_MS = 9000;

@Injectable({
  providedIn: 'root'
})
export class AdPlacementManagerService {
  private readonly slots = new Map<string, AdSlot>();
  private readonly usedAdIds = new Set<number>();
  private readonly rotationSubscriptions = new Map<string, Subscription>();

  private closedPopupSlots = new Set<string>();

  private readonly leftRailSubject = new BehaviorSubject<AdCampaign | null>(null);
  private readonly rightRailSubject = new BehaviorSubject<AdCampaign | null>(null);
  private readonly bottomLeftPopupSubject = new BehaviorSubject<AdCampaign | null>(null);
  private readonly bottomRightPopupSubject = new BehaviorSubject<AdCampaign | null>(null);

  readonly leftRail$ = this.leftRailSubject.asObservable();
  readonly rightRail$ = this.rightRailSubject.asObservable();
  readonly bottomLeftPopup$ = this.bottomLeftPopupSubject.asObservable();
  readonly bottomRightPopup$ = this.bottomRightPopupSubject.asObservable();

  constructor() {
    const stored = sessionStorage.getItem(CLOSED_POPUPS_KEY);
    if (stored) {
      this.closedPopupSlots = new Set(JSON.parse(stored));
    }
  }

  /**
   * Initialize all ad slots with their respective ad pools
   */
  initializeSlots(
    sidebarShowcase: AdCampaign[],
    jobFeedBanners: AdCampaign[],
    profileSpotlights: AdCampaign[],
    landingPageBanners: AdCampaign[]
  ): void {
    // Clear existing state
    this.cleanup();
    this.usedAdIds.clear();

    // Left Rail: Sidebar Showcase (Type 3)
    this.createSlot('leftRail', sidebarShowcase, this.leftRailSubject);

    // Right Rail: Job Feed Banner (Type 5)
    this.createSlot('rightRail', jobFeedBanners, this.rightRailSubject);

    // Bottom-Left Popup: Profile Spotlight (Type 1)
    if (!this.closedPopupSlots.has('bottomLeftPopup')) {
      this.createSlot('bottomLeftPopup', profileSpotlights, this.bottomLeftPopupSubject);
    }

    // Bottom-Right Popup: Landing Page Banner (Type 2)
    if (!this.closedPopupSlots.has('bottomRightPopup')) {
      this.createSlot('bottomRightPopup', landingPageBanners, this.bottomRightPopupSubject);
    }
  }

  /**
   * Create a slot and start rotation if multiple ads available
   */
  private createSlot(
    slotId: string,
    availableAds: AdCampaign[],
    subject: BehaviorSubject<AdCampaign | null>
  ): void {
    // Filter out ads already used in other slots
    const uniqueAds = availableAds.filter(ad => !this.usedAdIds.has(ad.id));

    if (uniqueAds.length === 0) {
      subject.next(null);
      return;
    }

    const slot: AdSlot = {
      slotId,
      currentAd: uniqueAds[0],
      availableAds: uniqueAds,
      currentIndex: 0,
      rotationEnabled: uniqueAds.length > 1
    };

    this.slots.set(slotId, slot);
    this.usedAdIds.add(uniqueAds[0].id);
    subject.next(uniqueAds[0]);

    // Start rotation if multiple ads available
    if (slot.rotationEnabled) {
      this.startRotation(slotId, subject);
    }
  }

  /**
   * Start smooth rotation for a slot
   */
  private startRotation(slotId: string, subject: BehaviorSubject<AdCampaign | null>): void {
    const subscription = interval(ROTATION_INTERVAL_MS).subscribe(() => {
      const slot = this.slots.get(slotId);
      if (!slot || !slot.rotationEnabled) {
        return;
      }

      // Remove current ad from used set
      if (slot.currentAd) {
        this.usedAdIds.delete(slot.currentAd.id);
      }

      // Move to next ad
      slot.currentIndex = (slot.currentIndex + 1) % slot.availableAds.length;
      slot.currentAd = slot.availableAds[slot.currentIndex];

      // Add new ad to used set
      if (slot.currentAd) {
        this.usedAdIds.add(slot.currentAd.id);
      }

      // Emit new ad
      subject.next(slot.currentAd);
    });

    this.rotationSubscriptions.set(slotId, subscription);
  }

  /**
   * Close a popup slot and persist the state
   */
  closePopup(slotId: string): void {
    this.closedPopupSlots.add(slotId);
    sessionStorage.setItem(CLOSED_POPUPS_KEY, JSON.stringify([...this.closedPopupSlots]));

    // Stop rotation and clear the slot
    const subscription = this.rotationSubscriptions.get(slotId);
    if (subscription) {
      subscription.unsubscribe();
      this.rotationSubscriptions.delete(slotId);
    }

    const slot = this.slots.get(slotId);
    if (slot?.currentAd) {
      this.usedAdIds.delete(slot.currentAd.id);
    }

    this.slots.delete(slotId);

    // Emit null to hide the popup
    if (slotId === 'bottomLeftPopup') {
      this.bottomLeftPopupSubject.next(null);
    } else if (slotId === 'bottomRightPopup') {
      this.bottomRightPopupSubject.next(null);
    }
  }

  /**
   * Check if a popup slot is closed
   */
  isPopupClosed(slotId: string): boolean {
    return this.closedPopupSlots.has(slotId);
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.rotationSubscriptions.forEach(sub => sub.unsubscribe());
    this.rotationSubscriptions.clear();
    this.slots.clear();
  }

  /**
   * Reset session (for testing or page refresh)
   */
  resetSession(): void {
    this.closedPopupSlots.clear();
    sessionStorage.removeItem(CLOSED_POPUPS_KEY);
    this.cleanup();
  }
}
