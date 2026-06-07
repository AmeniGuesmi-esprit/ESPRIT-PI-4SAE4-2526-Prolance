import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-activity-form',
  templateUrl: './activity-form.component.html',
  styleUrls: ['./activity-form.component.css']
})
export class ActivityFormComponent {
  @Input() set activityForm(form: FormGroup) {
  if (form) {
    this._activityForm = form;
  }
}
get activityForm(): FormGroup {
  return this._activityForm;
}
private _activityForm!: FormGroup;
  @Input() index!: number;
  @Output() removeActivity = new EventEmitter<number>();

  isFieldInvalid(fieldName: string): boolean {
    const field = this.activityForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  onRemove(): void {
    this.removeActivity.emit(this.index);
  }
}