import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UserSubscriptionService } from './user-subscription.service';

describe('UserSubscriptionService', () => {
  let service: UserSubscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserSubscriptionService]
    });
    service = TestBed.inject(UserSubscriptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
