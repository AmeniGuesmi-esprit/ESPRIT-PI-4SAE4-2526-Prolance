import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SubscriptionService } from './subscription.service';
import { AuthService } from './auth.services';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authSpy.getCurrentUser.and.returnValue({ id: 1, email: 'test@test.com', role: 'USER', token: 'tok', name: 'T', lastName: 'U' });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SubscriptionService,
        { provide: AuthService, useValue: authSpy }
      ]
    });
    service = TestBed.inject(SubscriptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
