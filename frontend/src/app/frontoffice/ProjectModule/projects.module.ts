import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProjectsRoutingModule } from './projects-routing.module';
import { ProjectsComponent } from './components/projects/projects.component';
import { ProjectFormComponent } from './components/project-form/project-form.component';
import { FreelancerApplyComponent } from './components/freelancer-apply/freelancerApply.component';
import { ProjectDetailsComponent } from './components/projects-details/projectDetails.component';
import { FreelancerSkillsSetupComponent } from './components/freelancer-skills-setup/freelancer-skills-setup.component';
import { ToastComponent } from './components/toast/toast.component';
import { ApplicantsModalComponent } from './components/applicants-modal/applicants-modal.component';
import { AiRecommendationsComponent } from './components/ai-recommendations/ai-recommendations.component';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [ProjectsComponent, ProjectFormComponent, ProjectDetailsComponent, FreelancerApplyComponent,FreelancerSkillsSetupComponent, ToastComponent, ApplicantsModalComponent, AiRecommendationsComponent],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ProjectsRoutingModule,HttpClientModule,],
  exports: [ProjectsComponent]
})
export class ProjectsModule {}
