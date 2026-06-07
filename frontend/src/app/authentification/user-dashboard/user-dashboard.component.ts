import { Component, OnInit } from '@angular/core';

interface Activity {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
}

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit {

  // ── Current User ──
  currentUser: { name: string; role: string } | null = null;

  get currentRole(): string {
    return this.currentUser?.role.toLowerCase() || '';
  }

  // ── Freelancer KPIs ──
  freelancerStats = {
    activeBids: 7,
    upcomingDeadlines: 3,
    recentEarnings: 8300,
    completedProjects: 24
  };

  // ── Client KPIs ──
  clientStats = {
    activeJobPosts: 5,
    unreadProposals: 12,
    totalSpent: 42500,
    hiredFreelancers: 9
  };

  freelancerActivity: Activity[] = [
    { icon: 'send',           iconColor: 'info',    title: 'Proposal sent',              subtitle: 'Mobile App MVP — Nova Startups',     time: '2 hours ago' },
    { icon: 'check_circle',   iconColor: 'success', title: 'Milestone approved',          subtitle: 'E-commerce Redesign — Acme Corp',    time: '5 hours ago' },
    { icon: 'payments',       iconColor: 'primary', title: 'Payment received — $2,500',   subtitle: 'Brand Identity — Global Media',       time: '1 day ago' },
    { icon: 'rate_review',    iconColor: 'warning', title: 'New review received',         subtitle: '5 stars from TechVentures',           time: '2 days ago' },
    { icon: 'assignment',     iconColor: 'info',    title: 'Contract signed',             subtitle: 'API Integration Suite',               time: '3 days ago' },
  ];

  clientActivity: Activity[] = [
    { icon: 'description',    iconColor: 'info',    title: 'New proposal received',       subtitle: 'Landing Page Design — Sarah Chen',    time: '1 hour ago' },
    { icon: 'how_to_reg',     iconColor: 'success', title: 'Freelancer hired',            subtitle: 'Lina Morales — SEO Audit',            time: '4 hours ago' },
    { icon: 'payments',       iconColor: 'primary', title: 'Payment released — $1,800',   subtitle: 'Mobile App MVP — James Walker',       time: '1 day ago' },
    { icon: 'work',           iconColor: 'warning', title: 'Job post published',          subtitle: 'Full-Stack Dashboard',                time: '2 days ago' },
    { icon: 'star',           iconColor: 'success', title: 'Review submitted',            subtitle: '5 stars to Aisha Patel',              time: '3 days ago' },
  ];

  constructor() {}

  ngOnInit(): void {
    // Load user session from localStorage
    const name = localStorage.getItem('userName') || 'User';
    const role = localStorage.getItem('role') || 'client';

    this.currentUser = { name, role };
  }
}
