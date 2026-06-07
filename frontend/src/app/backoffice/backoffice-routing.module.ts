import { NgModule } from '@angular/core';

import { RouterModule, Routes } from '@angular/router';

import { BackofficeLayoutComponent } from './backoffice-layout.component';

import { DashboardComponent } from './components/dashboard/dashboard.component';

import { AdminAdsComponent } from '../pages/admin/ads/admin-ads.component';

import { AdminUsersComponent } from '../pages/admin/user/admin-user.component';

import { GestionForumComponent } from './GestionForum/gestion-forum.component';

import { AdminProjectsComponent } from './components/admin-projects/admin-projects.component';

import { EventFormComponent } from './components/event-form/event-form.component';

import { AdminEventsComponent } from './components/admin-evenement/admin-event.component';

import { SubscriptionListComponent } from './subscriptions/subscription-list/subscription-list.component';

import { SubscriptionStatsComponent } from './subscriptions/subscription-stats/subscription-stats.component';

import { ChurnPredictionComponent } from './subscriptions/churn-prediction/churn-prediction.component';

import { PromoManagementComponent } from './subscriptions/promo-management/promo-management.component';

import { SubscriptionMainComponent } from './subscriptions/subscription-main/subscription-main.component';

const routes: Routes = [
  {
    path: '',

    component: BackofficeLayoutComponent,

    children: [

      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },

      { path: 'dashboard', component: DashboardComponent },

      { path: 'users',     component: AdminUsersComponent },

      {

        path: 'projects',

        component: AdminProjectsComponent

      },

      {
        path: 'ads',
        component: AdminAdsComponent
      },
      { path: 'forum',     component: GestionForumComponent },
      {
        path: 'events',
        component: AdminEventsComponent
      },
      {
        path: 'events/create',
        component: EventFormComponent
      },
      {
        path: 'events/edit/:id',
        component: EventFormComponent
      },
     {
        path: 'subscription',
        component: SubscriptionMainComponent,
        children: [
          { path: '', redirectTo: 'list', pathMatch: 'full' },
          { path: 'list', component: SubscriptionListComponent },
          { path: 'stats', component: SubscriptionStatsComponent },
          { path: 'churn', component: ChurnPredictionComponent },
          { path: 'promos', component: PromoManagementComponent }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],

  exports: [RouterModule], // ✅ IMPORTANT : nécessaire pour <router-outlet> dans BackofficeLayoutComponent

})

export class BackofficeRoutingModule {}