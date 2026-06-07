import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EventListComponent } from './Components/event-list/event-list.component';
import { InscriptionFormComponent } from './Components/inscription-form/inscription-form.component';


const routes: Routes = [
  { path: '', component: EventListComponent },
  { path: 'events/:id/inscription', component: InscriptionFormComponent },
  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GestionEvenementRoutingModule {}