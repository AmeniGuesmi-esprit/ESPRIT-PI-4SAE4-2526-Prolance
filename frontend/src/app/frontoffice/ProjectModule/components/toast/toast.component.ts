import { Component, OnInit } from '@angular/core';
import { Toast, ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit {
  toasts: Toast[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toasts$.subscribe(toasts => this.toasts = toasts);
  }

  remove(id: number): void {
    this.toastService.remove(id);
  }

  getIcon(type: string): string {
    return { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }[type] || 'ℹ️';
  }

  getTitle(type: string): string {
    return { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info' }[type] || 'Info';
  }
}