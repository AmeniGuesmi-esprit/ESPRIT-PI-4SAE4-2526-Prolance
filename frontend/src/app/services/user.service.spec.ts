import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const BASE = 'http://localhost:8222/users';
  const AI_URL = 'http://localhost:8222/api/ai/generate-avatar';

  const mockUser = {
    id: 1, name: 'Fawzi', lastName: 'Saidi',
    email: 'fawzi@prolance.tn', role: 'USER',
    birthDate: '2000-01-01', enabled: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── getUserById ─────────────────────────────────────────────
  it('should GET user by id', () => {
    service.getUserById(1).subscribe(u => expect(u.email).toBe('fawzi@prolance.tn'));
    const req = httpMock.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  // ─── updateUser ──────────────────────────────────────────────
  it('should PUT to update user', () => {
    service.updateUser(1, { name: 'Mohamed' }).subscribe(u => expect(u.name).toBe('Mohamed'));
    const req = httpMock.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Mohamed' });
    req.flush({ ...mockUser, name: 'Mohamed' });
  });

  // ─── updateAvatar ────────────────────────────────────────────
  it('should PUT avatar as base64', () => {
    const b64 = 'data:image/png;base64,abc123';
    service.updateAvatar(1, b64).subscribe();
    const req = httpMock.expectOne(`${BASE}/1/avatar`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ avatar: b64 });
    req.flush({ avatar: b64 });
  });

  // ─── updateBio ───────────────────────────────────────────────
  it('should PUT bio', () => {
    service.updateBio(1, 'Full-stack dev').subscribe(res => expect(res.bio).toBe('Full-stack dev'));
    const req = httpMock.expectOne(`${BASE}/1/bio`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ bio: 'Full-stack dev' });
    req.flush({ bio: 'Full-stack dev' });
  });

  // ─── changePassword ──────────────────────────────────────────
  it('should POST change-password', () => {
    service.changePassword(1, 'oldPass', 'newPass').subscribe();
    const req = httpMock.expectOne(`${BASE}/1/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ currentPassword: 'oldPass', newPassword: 'newPass' });
    req.flush({ message: 'Password changed' });
  });

  // ─── deleteAccount ───────────────────────────────────────────
  it('should DELETE user account', () => {
    service.deleteAccount(1).subscribe();
    const req = httpMock.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ─── generateAiAvatar ────────────────────────────────────────
  it('should POST to AI avatar endpoint and return image string', () => {
    service.generateAiAvatar('cartoon developer', 42).subscribe(img => {
      expect(img).toBe('base64imagedata');
    });
    const req = httpMock.expectOne(AI_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ prompt: 'cartoon developer', seed: 42 });
    req.flush({ image: 'base64imagedata' });
  });

  // ─── error handling ──────────────────────────────────────────
  it('should handle 404 error gracefully', () => {
    service.getUserById(999).subscribe({
      error: err => expect(err.message).toBe('User not found.')
    });
    const req = httpMock.expectOne(`${BASE}/999`);
    req.flush('Not found', { status: 404, statusText: 'Not Found' });
  });

  it('should handle 401 error as session expired', () => {
    service.getUserById(1).subscribe({
      error: err => expect(err.message).toBe('Session expired. Please login again.')
    });
    const req = httpMock.expectOne(`${BASE}/1`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should handle 403 error as permission denied', () => {
    service.deleteAccount(1).subscribe({
      error: err => expect(err.message).toBe('You do not have permission.')
    });
    const req = httpMock.expectOne(`${BASE}/1`);
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });
});
