import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { RoleService } from '../../services/role.service';
import { AuthService, SessionUser } from '../../services/auth.services';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.scss']
})
export class UserLayoutComponent implements OnInit, OnDestroy {
  navbarScrolled = false;
  profileDropdownOpen = false;
  mobileMenuOpen = false;
  subscriptionDropdownOpen = false;
  currentYear = new Date().getFullYear();
  currentUser: SessionUser | null = null;

  private destroy$ = new Subject<void>();

  get currentRole(): string {
    return this.roleService.currentRole;
  }

  get isAdmin(): boolean {
    return this.currentRole === 'admin';
  }

  get userInitials(): string {
    if (!this.currentUser) return '?';
    const name = [this.currentUser.name, this.currentUser.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (!name) return '?';
    return name
      .split(' ')
      .map(p => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  constructor(
    private router: Router,
    private roleService: RoleService,
    private authService: AuthService
  ) {}

  @HostListener('window:scroll')
  onScroll(): void {
    this.navbarScrolled = window.scrollY > 10;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-dropdown-wrapper')) {
      this.profileDropdownOpen = false;
    }
    if (!target.closest('.subscription-dropdown')) {
      this.subscriptionDropdownOpen = false;
    }
  }

  ngOnInit(): void {
    document.body.classList.add('user-portal');

    // Read immediately first
    this.currentUser = this.authService.getCurrentUser();

    // Then subscribe for changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('user-portal');
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleRole(role: 'freelancer' | 'client'): void {
    this.roleService.setRole(role);
  }

  toggleProfileDropdown(): void {
    this.profileDropdownOpen = !this.profileDropdownOpen;
    this.subscriptionDropdownOpen = false;
  }

  toggleSubscriptionDropdown(): void {
    this.subscriptionDropdownOpen = !this.subscriptionDropdownOpen;
    this.profileDropdownOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeAllMenus(): void {
    this.mobileMenuOpen = false;
    this.subscriptionDropdownOpen = false;
    this.profileDropdownOpen = false;
  }

  goToAdmin(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}