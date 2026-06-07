import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { GestionEvenementRoutingModule } from './gestion-evenement-routing';
import { EventListComponent } from './Components/event-list/event-list.component';

import { EventService } from './services/event.service';
import { ActivityService } from './services/activity.service';
import { InscriptionService } from './services/inscription.service';  // ← AJOUT
import { InscriptionFormComponent } from './Components/inscription-form/inscription-form.component';
import { EventMapComponent } from './Components/event-map/event-map.component';

@NgModule({
  declarations: [
    EventListComponent,
    InscriptionFormComponent,
    EventMapComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    GestionEvenementRoutingModule
  ],
  providers: [EventService, ActivityService, InscriptionService]  // ← InscriptionService ajouté
})
export class GestionEvenementModule {}