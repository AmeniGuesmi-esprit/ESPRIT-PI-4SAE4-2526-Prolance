import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  activeMenu: string = 'dashboard';

  menuItems = [
    { id: 'dashboard',    icon: '📊', label: 'DASHBOARD',    link: '/admin/dashboard' },
    { id: 'users',        icon: '👥', label: 'USERS',        link: '/admin/users' },
    { id: 'projects',     icon: '📋', label: 'PROJETS',      link: '/admin/projects' },
    { id: 'forum',        icon: '💬', label: 'FORUM',        link: '/admin/forum' },
    { id: 'ads',          icon: '�', label: 'ADS',          link: '/admin/ads' },
    { id: 'evenement',    icon: '�', label: 'ÉVÉNEMENT',    link: '/admin/events' },
    { id: 'subscription', icon: '💳', label: 'ABONNEMENTS',  link: '/admin/subscription' },
    { id: 'logout',       icon: '🔌', label: 'LOGOUT',       link: '/login' },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url;
        const match = this.menuItems.find(item => url.startsWith(item.link));
        if (match) this.activeMenu = match.id;
      });

    const url = this.router.url;
    const match = this.menuItems.find(item => url.startsWith(item.link));
    if (match) this.activeMenu = match.id;
  }

  setActiveMenu(menuId: string): void {
    this.activeMenu = menuId;
  }
}