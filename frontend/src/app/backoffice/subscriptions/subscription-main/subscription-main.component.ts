// subscription-main.component.ts - Version finale
import { Component } from '@angular/core';

@Component({
  selector: 'app-subscription-main',
  templateUrl: './subscription-main.component.html',
  styleUrls: ['./subscription-main.component.scss']
})
export class SubscriptionMainComponent {
  activeTab: string = 'list';

  navigateTo(tab: string): void {
    this.activeTab = tab;
  }
}