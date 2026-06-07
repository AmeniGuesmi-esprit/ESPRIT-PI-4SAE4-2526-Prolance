import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  activeTab: string = 'accounts';

  stats = {
    totalShipments: 763215,
    dailySales: 3500,
    completedTasks: 12100
  };

  constructor() { }

  ngOnInit(): void {
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    console.log('Tab actif:', tab);
  }
}
