import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private roleSubject = new BehaviorSubject<'freelancer' | 'client'>('freelancer');
  currentRole$ = this.roleSubject.asObservable();

  get currentRole(): 'freelancer' | 'client' {
    return this.roleSubject.value;
  }

  setRole(role: 'freelancer' | 'client'): void {
    this.roleSubject.next(role);
  }
}
