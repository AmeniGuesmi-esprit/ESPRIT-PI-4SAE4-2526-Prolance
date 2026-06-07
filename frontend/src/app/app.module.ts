import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app.routing';
import { ComponentsModule } from './frontoffice/components.module';
import { AppComponent } from './app.component';
import { UserLayoutComponent } from './frontoffice/user-layout/user-layout.component';
import { LandingModule } from './authentification/landing/landing.module';
import { AuthModule } from './authentification/auth/auth.module';
import { AdDetailsComponent } from './pages/ads/ad-details/ad-details.component';
import { AdPolicyComponent } from './pages/ads/ad-policy/ad-policy.component';

@NgModule({
  imports: [
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    ComponentsModule,
    RouterModule,
    AppRoutingModule,
    LandingModule,
    AuthModule,
  ],
  declarations: [
    AppComponent,
    UserLayoutComponent,
    AdDetailsComponent,
    AdPolicyComponent,
  ],
  providers: [ {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }],
  bootstrap: [AppComponent]
})
export class AppModule { }
