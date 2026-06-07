import { TestBed } from '@angular/core/testing';
import { RoleService } from './role.service';

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [RoleService] });
    service = TestBed.inject(RoleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to freelancer role', () => {
    expect(service.currentRole).toBe('freelancer');
  });

  it('should update role to client via setRole()', () => {
    service.setRole('client');
    expect(service.currentRole).toBe('client');
  });

  it('should update role back to freelancer', () => {
    service.setRole('client');
    service.setRole('freelancer');
    expect(service.currentRole).toBe('freelancer');
  });

  it('should emit new role via currentRole$ observable', (done) => {
    const emitted: string[] = [];
    service.currentRole$.subscribe(role => {
      emitted.push(role);
      if (emitted.length === 2) {
        expect(emitted[0]).toBe('freelancer'); // initial value
        expect(emitted[1]).toBe('client');
        done();
      }
    });
    service.setRole('client');
  });
});
