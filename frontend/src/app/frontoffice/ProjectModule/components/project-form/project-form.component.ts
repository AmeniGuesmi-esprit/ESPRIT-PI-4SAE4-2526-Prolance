import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Project } from '../../models/project.model';
import { Task } from '../../models/task.model';
import { ProjectsService } from '../../services/projects.service';
import { GrokService } from '../../services/grok.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmailNotificationService } from '../../services/email-notification.service';
import { AuthService } from 'app/services/auth.services';

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit {
  @Input() project?: Project;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  minDate: string = '';
  maxDate: string = '';
  dateError = '';
  selectedTab = 'details';

  // AI - Full project generation
  aiPrompt = '';
  isGenerating = false;
  aiError = '';

  // AI - Tasks only generation
  isGeneratingTasks = false;
  tasksAiError = '';

  form: FormGroup;
  tasks: Task[] = [];
  newTaskName = '';
  newTaskDescription = '';
  newTaskPriority = 'MEDIUM';
  newTaskStartDate = '';
  newTaskEndDate = '';
  newTaskMilestone = '';
  showTaskInput = false;
  isSubmitting = false;

  categoryOptions = ['DEV', 'DESIGN'];
  priorityOptions = ['LOW', 'MEDIUM', 'HIGH'];

  constructor(
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private grokService: GrokService,
    private emailService: EmailNotificationService,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      budget: [null, [Validators.required, Validators.min(100)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      category: ['DEV', Validators.required]
    });
  }

  ngOnInit() {
    this.setDateConstraints();
    if (this.project) {
      this.form.patchValue(this.project);
      this.tasks = this.project.tasks || [];
    }
  }

  setDateConstraints(): void {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    const maxDateObj = new Date();
    maxDateObj.setFullYear(maxDateObj.getFullYear() + 1);
    this.maxDate = maxDateObj.toISOString().split('T')[0];
  }

  validateDates(): void {
    const startDateValue = this.form.get('startDate')?.value;
    const endDateValue = this.form.get('endDate')?.value;

    if (!startDateValue || !endDateValue) {
      this.dateError = '';
      return;
    }

    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);

    if (endDate < startDate) {
      this.dateError = 'End date must be after start date';
      return;
    }

    const threeMonthsLater = new Date(startDate);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    if (endDate < threeMonthsLater) {
      this.dateError = 'Project duration must be at least 3 months';
      return;
    }

    this.dateError = '';
  }

  generateWithAI(): void {
    this.isGenerating = true;
    this.aiError = '';

    this.grokService.generateProject(this.aiPrompt).subscribe({
      next: (generated) => {
        this.form.patchValue({
          title: generated.title,
          description: generated.description,
          category: generated.category
          // no budget, no startDate, no endDate — user fills manually
        });
        this.tasks = generated.tasks.map(t => ({
          taskName: t.taskName,
          description: t.description,
          priority: t.priority as any,
          milestone: '',
          startDate: '',
          endDate: ''
        }));
        this.isGenerating = false;
        this.selectedTab = 'details';
      },
      error: (err) => {
        console.error('Grok API error:', err);
        this.aiError = 'Erreur de génération. Vérifie ta connexion et ta clé API.';
        this.isGenerating = false;
      }
    });
  }

  generateTasksOnly(): void {
    const title = this.form.get('title')?.value?.trim();
    const description = this.form.get('description')?.value?.trim();
    const category = this.form.get('category')?.value;
    const startDate = this.form.get('startDate')?.value;
    const endDate = this.form.get('endDate')?.value;

    if (!title || title.length < 5) {
      this.tasksAiError = 'Remplis d\'abord le titre du projet (min. 5 caractères) dans l\'onglet Details.';
      return;
    }

    this.isGeneratingTasks = true;
    this.tasksAiError = '';

    const prompt = `Projet: "${title}". ${description ? 'Description: ' + description : ''} Catégorie: ${category || 'DEV'}.`;

    this.grokService.generateTasksForProject(prompt, startDate, endDate).subscribe({
      next: (generatedTasks) => {
        this.tasks = generatedTasks.map(t => ({
          taskName: t.taskName,
          description: t.description,
          priority: t.priority as any,
          milestone: '',
          startDate: startDate || '',
          endDate: endDate || ''
        }));
        this.isGeneratingTasks = false;
      },
      error: (err) => {
        console.error('Tasks generation error:', err);
        this.tasksAiError = 'Erreur de génération des tâches. Réessaie.';
        this.isGeneratingTasks = false;
      }
    });
  }

  addTask(): void {
    if (!this.newTaskName.trim()) {
      alert('Task name is required');
      return;
    }

    const newTask: Task = {
      taskName: this.newTaskName,
      description: this.newTaskDescription,
      priority: this.newTaskPriority as any,
      milestone: this.newTaskMilestone,
      startDate: this.newTaskStartDate,
      endDate: this.newTaskEndDate
    };

    this.tasks.push(newTask);
    this.newTaskName = '';
    this.newTaskDescription = '';
    this.newTaskPriority = 'MEDIUM';
    this.newTaskMilestone = '';
    this.newTaskStartDate = '';
    this.newTaskEndDate = '';
    this.showTaskInput = false;
  }

  removeTask(index: number): void {
    this.tasks.splice(index, 1);
  }

  updateTask(index: number, task: Task): void {
    this.tasks[index] = task;
  }

  submit(): void {
    if (this.form.invalid || this.dateError) { alert('Please fill all required fields correctly'); return; }
    if (this.tasks.length === 0) { alert('Please add at least one task'); return; }
    this.isSubmitting = true;

    const projectData = {
      ...this.form.value,
      status: 'IN_PROGRESS',
      tasks: this.tasks,
      requiredSkills: []
    } as Project;

    if (this.project?.id) {
      projectData.id = this.project.id;
      this.projectsService.updateProject(projectData).subscribe({
        next: () => { this.saved.emit(); this.closeModal(); this.isSubmitting = false; },
        error: (err) => { console.error(err); alert('Error updating project'); this.isSubmitting = false; }
      });
    } else {
      this.projectsService.createProject(projectData).subscribe({
        next: (createdProject) => {
          const currentUser = this.authService.getCurrentUser();
          if (currentUser?.email) {
            this.emailService.sendProjectCreatedEmail(
              createdProject.id!,
              currentUser.email,
              projectData.title
            ).subscribe({
              next: () => console.log('✅ Email de création envoyé à', currentUser.email),
              error: (err) => console.warn('⚠️ Email non envoyé:', err)
            });
          }
          this.saved.emit();
          this.closeModal();
          this.isSubmitting = false;
        },
        error: (err) => { console.error(err); alert('Error creating project'); this.isSubmitting = false; }
      });
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  isFormValid(): boolean {
    return this.form.valid && this.dateError === '' && this.tasks.length > 0;
  }
}