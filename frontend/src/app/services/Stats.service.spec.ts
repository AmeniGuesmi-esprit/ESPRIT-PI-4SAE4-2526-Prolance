import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StatsService } from './Stats.service';

describe('StatsService', () => {
  let service: StatsService;
  let httpMock: HttpTestingController;

  const mockStats = {
    totalUsers: 500,
    totalFreelancers: 300,
    totalClients: 200,
    activeSubscriptions: 120,
    mostPopularPlan: 'Pro',
    planDistribution: { Free: 200, Pro: 180, Enterprise: 120 },
    totalPlans: 3,
    satisfactionRate: 4.7,
    avgResponseTime: 2.3,
    projectsCompleted: 850,
    totalRevenue: 45000
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StatsService]
    });
    service = TestBed.inject(StatsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET platform stats', () => {
    service.getPlatformStats().subscribe(stats => {
      expect(stats.totalUsers).toBe(500);
      expect(stats.mostPopularPlan).toBe('Pro');
      expect(stats.totalRevenue).toBe(45000);
    });
    const req = httpMock.expectOne('http://localhost:8222/api/stats/platform');
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });

  it('should return correct planDistribution object', () => {
    service.getPlatformStats().subscribe(stats => {
      expect(stats.planDistribution['Pro']).toBe(180);
    });
    httpMock.expectOne('http://localhost:8222/api/stats/platform').flush(mockStats);
  });
});
