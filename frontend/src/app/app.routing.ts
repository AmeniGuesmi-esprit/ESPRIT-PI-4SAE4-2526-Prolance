import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { Routes, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { UserLayoutComponent } from './frontoffice/user-layout/user-layout.component';
import { LandingComponent } from './authentification/landing/landing.component';
import { LoginComponent } from './authentification/auth/login/login.component';
import { RegisterComponent } from './authentification/auth/register/register.component';
import { AdDetailsComponent } from './pages/ads/ad-details/ad-details.component';
import { AdPolicyComponent } from './pages/ads/ad-policy/ad-policy.component';
import { ResetPasswordComponent } from './authentification/auth/reset-password/reset-password.component';

const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'ads/:id',
    component: AdDetailsComponent,
  },
  {
    path: 'ads-policy',
    component: AdPolicyComponent,
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
  },
  {
    path: 'app',
    component: UserLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./frontoffice/user-layout/user-layout.module').then(
            (m) => m.UserLayoutModule
          ),
      },
      // ✅ AJOUTÉ : route subscription manquante
      {
        path: 'subscription',
        loadChildren: () =>
          import('./frontoffice/subscriptions/subscriptions.module').then(
            (m) => m.SubscriptionsModule
          ),
      },
    ],
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./backoffice/backoffice.module').then(
        (m) => m.BackofficeModule
      ),
  },
];

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot(routes, {
      useHash: true,
    }),
  ],
  exports: [RouterModule], // ✅ IMPORTANT : exporte RouterModule sinon <router-outlet> ne fonctionne pas
})
export class AppRoutingModule {}