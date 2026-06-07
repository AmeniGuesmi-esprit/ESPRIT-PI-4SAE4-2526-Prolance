import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  toasts$ = new BehaviorSubject<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info', duration = 5000): void {
    const toast: Toast = { id: ++this.counter, message, type, duration };
    this.toasts$.next([...this.toasts$.value, toast]);
    setTimeout(() => this.remove(toast.id), duration);
  }

  success(message: string)  { this.show(message, 'success', 5000); }
  error(message: string)    { this.show(message, 'error',   7000); }
  warning(message: string)  { this.show(message, 'warning', 5000); }
  info(message: string)     { this.show(message, 'info',    5000); }

  remove(id: number): void {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }
}