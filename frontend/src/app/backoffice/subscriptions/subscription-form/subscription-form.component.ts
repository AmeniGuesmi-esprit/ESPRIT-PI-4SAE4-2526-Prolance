import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from '../../../models/subscription.model';
import { SubscriptionService } from '../../../services/subscription.service';

@Component({
  selector: 'app-subscription-form',
  templateUrl: './subscription-form.component.html',
  styleUrls: ['./subscription-form.component.scss'],
})
export class SubscriptionFormComponent implements OnInit {
  subscription: Subscription = {
    name: '',
    type: 'FREELANCER',
    price: 0,
    billingCycle: 'SEMESTRIELLE',
    description: '',
    maxProjects: 0,
    maxProposals: 0,
    maxActiveJobs: 0,
    featuredListing: false,
    prioritySupport: false,
    analyticsAccess: false,
    isActive: true,
  };

  isEditMode: boolean = false;
  editId: number | null = null;
  loading: boolean = false;
  errorMessage: string = '';
  formErrors: { [key: string]: string } = {};

  constructor(
    private subscriptionService: SubscriptionService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.editId = +id;
      this.loadSubscription(this.editId);
    }
  }

  loadSubscription(id: number): void {
    this.loading = true;
    this.subscriptionService.getSubscriptionById(id).subscribe(
      (data) => {
        this.subscription = data;
        this.loading = false;
      },
      (error) => {
        this.errorMessage = 'Unable to load plan.';
        this.loading = false;
      }
    );
  }

  validateForm(): boolean {
    this.formErrors = {};

    if (!this.subscription.name || this.subscription.name.length < 3 || this.subscription.name.length > 50) {
      this.formErrors['name'] = 'Name must be between 3 and 50 characters';
    }

    if (!this.subscription.price || this.subscription.price <= 0) {
      this.formErrors['price'] = 'Price must be greater than 0';
    }

    if (!this.subscription.type) {
      this.formErrors['type'] = 'Select a type';
    }

    if (!this.subscription.billingCycle) {
      this.formErrors['billingCycle'] = 'Select a billing cycle';
    }

    return Object.keys(this.formErrors).length === 0;
  }

  onSubmit(): void {
    if (!this.validateForm()) return;

    this.loading = true;

    if (this.isEditMode && this.editId) {
      this.subscriptionService.updateSubscription(this.editId, this.subscription).subscribe(
        () => {
          alert('✅ Plan updated successfully!');
          this.router.navigate(['/admin/subscription/list']);
        },
        (error) => {
          this.errorMessage = 'Error updating plan.';
          this.loading = false;
        }
      );
    } else {
      this.subscriptionService.createSubscription(this.subscription).subscribe(
        () => {
          alert('✅ Plan created successfully!');
          this.router.navigate(['/admin/subscription/list']);
        },
        (error) => {
          this.errorMessage = 'Error creating plan.';
          this.loading = false;
        }
      );
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/subscription/list']);
  }
}