/* import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';  // ✅ ADD THIS
import { SubscriptionsRoutingModule } from './subscriptions-routing.module';
import { SubscriptionListComponent } from './subscription-list/subscription-list.component';
import { SubscriptionFormComponent } from './subscription-form/subscription-form.component';
import { SubscriptionStatsComponent } from './subscription-stats/subscription-stats.component';
import { ChurnPredictionComponent } from './churn-prediction/churn-prediction.component';
import { PromoManagementComponent } from './promo-management/promo-management.component';
import { SubscriptionMainComponent } from './subscription-main/subscription-main.component';

@NgModule({
  declarations: [
    SubscriptionMainComponent,
    SubscriptionListComponent,
    SubscriptionStatsComponent,
    ChurnPredictionComponent,
    PromoManagementComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,   // ✅ ADD THIS — nécessaire pour les appels HTTP
    SubscriptionsRoutingModule,
  ],
    
  exports: [
    SubscriptionMainComponent,
    SubscriptionListComponent,
    SubscriptionStatsComponent,
    ChurnPredictionComponent,
    PromoManagementComponent,
  ], // ✅ IMPORTANT : Exporter les composants
})
export class SubscriptionsModule {} */