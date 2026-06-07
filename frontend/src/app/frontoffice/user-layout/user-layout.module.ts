import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';

import { UserDashboardComponent } from '../../authentification/user-dashboard/user-dashboard.component';
import { AdCenterComponent } from '../../pages/ads/ad-center.component';
import { InvoiceAgentComponent } from '../../pages/ads/invoice-agent/invoice-agent.component';
import { ProfileComponent } from '../../pages/user/profile.component';
import { SupportChatComponent } from '../../components/support-chat/support-chat.component';
import { ProjectsModule } from '../ProjectModule/projects.module';
import { ProjectsComponent } from '../ProjectModule/components/projects/projects.component';

const userRoutes: Routes = [
  { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: UserDashboardComponent },
  { path: 'ads',       component: AdCenterComponent },
  { path: 'profile',   component: ProfileComponent },
  { path: 'projects',  component: ProjectsComponent },
  {
    path: 'forum',
    loadChildren: () => import('../GestionForum/gestion-forum.module').then(m => m.GestionForumModule)
  },
  {
    path: 'events',
    loadChildren: () => import('../GestionEvenement/gestion-evenement').then(m => m.GestionEvenementModule)
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(userRoutes),
    MatTooltipModule,
    MatRippleModule,
    ProjectsModule,
  ],
  declarations: [
    UserDashboardComponent,
    AdCenterComponent,
    InvoiceAgentComponent,
    ProfileComponent,
    SupportChatComponent,
  ]
})
export class UserLayoutModule {}