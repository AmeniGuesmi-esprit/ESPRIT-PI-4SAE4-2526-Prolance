import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ForumListComponent } from './components/forum-list/forum-list.component';
import { PublicationFormComponent } from './components/publication-form/publication-form.component';

const routes: Routes = [
  {
    path: '',
    component: ForumListComponent
  },
  {
    path: 'nouveau',
    component: PublicationFormComponent
  },
  {
    path: 'modifier/:id',
    component: PublicationFormComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GestionForumRoutingModule { }