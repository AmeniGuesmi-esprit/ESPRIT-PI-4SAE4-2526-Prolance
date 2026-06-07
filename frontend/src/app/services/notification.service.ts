// services/notification.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  success(message: string): void {
    // For development - you can see this in console
    console.log('✅ Success:', message);
    
    // You can use a simple alert for now
    // alert('✅ ' + message);
    
    // Or you can create a simple DOM-based notification
    this.showNotification(message, 'success');
  }

  error(message: string): void {
    console.error('❌ Error:', message);
    // alert('❌ ' + message);
    this.showNotification(message, 'error');
  }

  info(message: string): void {
    console.log('ℹ️ Info:', message);
    // alert('ℹ️ ' + message);
    this.showNotification(message, 'info');
  }

  warning(message: string): void {
    console.warn('⚠️ Warning:', message);
    // alert('⚠️ ' + message);
    this.showNotification(message, 'warning');
  }

  // Simple DOM-based notification (optional)
  private showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    // You can implement a simple toast notification here
    // For now, we'll just use console
  }
}