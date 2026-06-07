import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let httpMock: HttpTestingController;

  const LIST_URL   = 'http://localhost:8222/api/auth/users';
  const UPDATE_URL = 'http://localhost:8222/users';

  const mockUsers = [
    { id: 1, name: 'Fawzi', email: 'fawzi@prolance.tn', role: 'USER', enabled: true },
    { id: 2, name: 'Admin', email: 'admin@prolance.tn', role: 'ADMIN', enabled: true }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminUsersService]
    });
    service = TestBed.inject(AdminUsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── getAll — direct array ────────────────────────────────────
  it('should GET all users (direct array)', () => {
    service.getAll().subscribe(users => {
      expect(users.length).toBe(2);
      expect(users[0].email).toBe('fawzi@prolance.tn');
    });
    const req = httpMock.expectOne(LIST_URL);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  // ─── getAll — wrapped in data property ───────────────────────
  it('should GET all users when wrapped in { data: [...] }', () => {
    service.getAll().subscribe(users => expect(users.length).toBe(2));
    const req = httpMock.expectOne(LIST_URL);
    req.flush({ data: mockUsers });
  });

  // ─── report ──────────────────────────────────────────────────
  it('should POST report user', () => {
    service.report(1).subscribe();
    const req = httpMock.expectOne(`${UPDATE_URL}/1/report`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ─── timeout ─────────────────────────────────────────────────
  it('should POST timeout user with until date', () => {
    service.timeout(1, '2026-06-01').subscribe();
    const req = httpMock.expectOne(`${UPDATE_URL}/1/timeout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ until: '2026-06-01' });
    req.flush({});
  });

  // ─── liftTimeout ─────────────────────────────────────────────
  it('should POST lift-timeout', () => {
    service.liftTimeout(1).subscribe();
    const req = httpMock.expectOne(`${UPDATE_URL}/1/lift-timeout`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ─── deactivate ──────────────────────────────────────────────
  it('should PUT to deactivate user', () => {
    service.deactivate(1).subscribe();
    const req = httpMock.expectOne(`${UPDATE_URL}/1/deactivate`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  // ─── reactivate ──────────────────────────────────────────────
  it('should PUT to reactivate user', () => {
    service.reactivate(1).subscribe();
    const req = httpMock.expectOne(`${UPDATE_URL}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enabled: true });
    req.flush({});
  });

  // ─── delete ──────────────────────────────────────────────────
  it('should DELETE user', () => {
    service.delete(1).subscribe();
    const req = httpMock.expectOne(`${UPDATE_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
