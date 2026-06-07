import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../../frontoffice/GestionEvenement/services/event.service';
import { CategoryEvent, EventStatus } from '../../../frontoffice/GestionEvenement/models/event.model';
import { AuthService } from 'app/services/auth.services';

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class EventFormComponent implements OnInit {
  eventForm!: FormGroup;
  isEditMode = false;
  eventId?: number;
  loading = false;
  successMsg = '';
  errorMsg = '';

  eventStatuses = Object.values(EventStatus);
  categories = Object.values(CategoryEvent);

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.eventId = +params['id'];
        this.loadEvent(this.eventId);
      }
    });
  }

  initForm(): void {
    this.eventForm = this.fb.group({
      title:       [''],
      description: [''],
      startDate:   [''],
      endDate:     [''],
      eventStatus: [EventStatus.PENDING],
      location:    [''],
      capacity:    [10],
      imageUrl:    [''],
      category:    [CategoryEvent.CONFERENCE],
      activities:  this.fb.array([])
    });
  }

  get activities(): FormArray {
    return this.eventForm.get('activities') as FormArray;
  }

  getActivityGroup(index: number): FormGroup {
    return this.activities.at(index) as FormGroup;
  }

  createActivityGroup(): FormGroup {
    return this.fb.group({
      idActivity:      [null],
      name:            [''],
      description:     [''],
      requirements:    ['']
     
    });
  }

  addActivity(): void {
    this.activities.push(this.createActivityGroup());
  }

  removeActivity(index: number): void {
    this.activities.removeAt(index);
  }

  loadEvent(id: number): void {
    this.loading = true;
    this.eventService.getEventById(id).subscribe({
      next: (event) => {
        this.eventForm.patchValue({
          title:       event.title,
          description: event.description,
          startDate:   event.startDate?.substring(0, 16),
          endDate:     event.endDate?.substring(0, 16),
          eventStatus: event.eventStatus,
          location:    event.location,
          capacity:    event.capacity,
          imageUrl:    event.imageUrl,
          category:    event.category
        });
        if (event.activities && event.activities.length > 0) {
          event.activities.forEach(act => {
            const group = this.createActivityGroup();
            group.patchValue({
              idActivity:      act.idActivity,
              name:            act.name,
              description:     act.description,
              requirements:    act.requirements
              
            });
            this.activities.push(group);
          });
        }
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Error loading event.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    this.loading = true;
    this.successMsg = '';
    this.errorMsg = '';

    const userId = this.authService.getCurrentUserId();

    if (!userId) {
      this.errorMsg = 'You must be logged in to create an event.';
      this.loading = false;
      this.router.navigate(['/login']);
      return;
    }

    const formValue = { ...this.eventForm.value, userId };

    if (this.isEditMode && this.eventId) {
      this.eventService.updateEvent(this.eventId, formValue).subscribe({
        next: () => {
          this.successMsg = 'Event updated successfully!';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/admin/events']), 1500);
        },
        error: () => {
          this.errorMsg = 'Error updating event.';
          this.loading = false;
        }
      });
    } else {
      this.eventService.createEvent(formValue).subscribe({
        next: () => {
          this.successMsg = 'Event created successfully!';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/admin/events']), 1500);
        },
        error: () => {
          this.errorMsg = 'Error creating event.';
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/admin/events']);
  }
}