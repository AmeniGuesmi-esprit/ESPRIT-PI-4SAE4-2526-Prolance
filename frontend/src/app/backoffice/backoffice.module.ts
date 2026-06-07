import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BackofficeRoutingModule } from './backoffice-routing.module';

import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { FooterComponent } from './components/footer/footer.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BackofficeLayoutComponent } from './backoffice-layout.component';
import { AdminAdsComponent } from '../pages/admin/ads/admin-ads.component';
import { AdminUsersComponent } from '../pages/admin/user/admin-user.component';
import { GestionForumComponent } from './GestionForum/gestion-forum.component';
import { ParticipantBadgeComponent } from './components/participant-badge/participant-badge.component';
import { ActivityFormComponent } from './components/activity-form/activity-form-component';
import { EventFormComponent } from './components/event-form/event-form.component';
import { AdminEventsComponent } from './components/admin-evenement/admin-event.component';
import { AdminProjectsComponent } from './components/admin-projects/admin-projects.component';
import { SubscriptionMainComponent } from './subscriptions/subscription-main/subscription-main.component';
import { SubscriptionListComponent } from './subscriptions/subscription-list/subscription-list.component';
import { SubscriptionStatsComponent } from './subscriptions/subscription-stats/subscription-stats.component';
import { ChurnPredictionComponent } from './subscriptions/churn-prediction/churn-prediction.component';
import { PromoManagementComponent } from './subscriptions/promo-management/promo-management.component';

@NgModule({
  declarations: [
    BackofficeLayoutComponent,
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    DashboardComponent,
    AdminAdsComponent,
    AdminUsersComponent,
    GestionForumComponent,
    AdminEventsComponent,
    EventFormComponent,
    ActivityFormComponent,
    ParticipantBadgeComponent,
    AdminProjectsComponent,
    SubscriptionMainComponent,
    SubscriptionListComponent,
    SubscriptionStatsComponent,
    ChurnPredictionComponent,
    PromoManagementComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    BackofficeRoutingModule,
    // ❌ SUPPRIMEZ ces lignes - les composants ne vont PAS dans imports
    // SubscriptionMainComponent,
    // SubscriptionListComponent,
    // SubscriptionStatsComponent,
    // ChurnPredictionComponent,
    // PromoManagementComponent,
  ]
})
export class BackofficeModule {}