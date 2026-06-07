import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectsComponent } from './components/projects/projects.component';
import { ProjectFormComponent } from './components/project-form/project-form.component';
import { ProjectDetailsComponent } from './components/projects-details/projectDetails.component';
import { FreelancerApplyComponent } from './components/freelancer-apply/freelancerApply.component';
import { FreelancerSkillsSetupComponent } from './components/freelancer-skills-setup/freelancer-skills-setup.component';

const routes: Routes = [
  { path: '',                  component: ProjectsComponent },
  { path: 'create-project',    component: ProjectFormComponent },
  { path: 'details/:id',       component: ProjectDetailsComponent },
  { path: 'apply/:id',         component: FreelancerApplyComponent },
  { path: 'skills-setup',      component: FreelancerSkillsSetupComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProjectsRoutingModule {}