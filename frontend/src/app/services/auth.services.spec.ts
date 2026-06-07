import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, SessionUser } from './auth.services';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: SessionUser = {
    id: 1,
    email: 'test@prolance.tn',
    role: 'USER',
    token: 'mock-token-123',
    name: 'Fawzi',
    lastName: 'Saidi',
    imageUrl: '',
    bio: ''
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ─── Creation ───────────────────────────────────────────────
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── isLoggedIn ──────────────────────────────────────────────
  it('should return false when no user is in storage', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('should return true after setSession is called', () => {
    service.setSession(mockUser, mockUser.email);
    expect(service.isLoggedIn()).toBeTrue();
  });

  // ─── getCurrentUser ──────────────────────────────────────────
  it('should return null when no user is logged in', () => {
    expect(service.getCurrentUser()).toBeNull();
  });

  it('should return the current user after setSession', () => {
    service.setSession(mockUser, mockUser.email);
    const user = service.getCurrentUser();
    expect(user).toBeTruthy();
    expect(user?.email).toBe('test@prolance.tn');
  });

  // ─── getRole ────────────────────────────────────────────────
  it('should return null role when not logged in', () => {
    expect(service.getRole()).toBeNull();
  });

  it('should return correct role after setSession', () => {
    service.setSession({ ...mockUser, role: 'ADMIN' }, mockUser.email);
    expect(service.getRole()).toBe('ADMIN');
  });

  // ─── getCurrentUserId ────────────────────────────────────────
  it('should return user id from session', () => {
    service.setSession(mockUser, mockUser.email);
    expect(service.getCurrentUserId()).toBe(1);
  });

  it('should return null when user is not logged in', () => {
    expect(service.getCurrentUserId()).toBeNull();
  });

  // ─── logout ──────────────────────────────────────────────────
  it('should clear session on logout', () => {
    service.setSession(mockUser, mockUser.email);
    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('sessionUser')).toBeNull();
  });

  // ─── updateSessionName ───────────────────────────────────────
  it('should update name and lastName in session', () => {
    service.setSession(mockUser, mockUser.email);
    service.updateSessionName('Mohamed', 'Ben Ali');
    const user = service.getCurrentUser();
    expect(user?.name).toBe('Mohamed');
    expect(user?.lastName).toBe('Ben Ali');
  });

  // ─── updateSessionAvatar ─────────────────────────────────────
  it('should update imageUrl in session', () => {
    service.setSession(mockUser, mockUser.email);
    service.updateSessionAvatar('https://cdn.prolance.tn/avatar.png');
    expect(service.getCurrentUser()?.imageUrl).toBe('https://cdn.prolance.tn/avatar.png');
  });

  // ─── currentUser$ observable ─────────────────────────────────
  it('should emit user via currentUser$ after setSession', (done) => {
    service.currentUser$.subscribe(user => {
      if (user) {
        expect(user.email).toBe('test@prolance.tn');
        done();
      }
    });
    service.setSession(mockUser, mockUser.email);
  });

  // ─── register HTTP ──────────────────────────────────────────
  it('should call POST /api/auth/register on register()', () => {
    const registerReq = { name: 'Fawzi', lastName: 'Saidi', email: 'test@prolance.tn', password: 'pass123', role: 'USER' };
    service.register(registerReq as any).subscribe();
    const req = httpMock.expectOne('http://localhost:8222/api/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush('OK');
  });

  // ─── login HTTP ─────────────────────────────────────────────
  it('should call POST /api/auth/login and set session on login()', () => {
    const loginReq = { email: 'test@prolance.tn', password: 'pass123' };
    service.login(loginReq).subscribe();
    const req = httpMock.expectOne('http://localhost:8222/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockUser);
    expect(service.isLoggedIn()).toBeTrue();
  });

  // ─── pending name recovery ───────────────────────────────────
  it('should recover pending name/lastName from localStorage after register+login', () => {
    localStorage.setItem('pending_name', 'Pending');
    localStorage.setItem('pending_lastName', 'User');
    localStorage.setItem('pending_email', 'test@prolance.tn');

    const responseWithoutName = { ...mockUser, name: '', lastName: '' };
    service.setSession(responseWithoutName, 'test@prolance.tn');

    const user = service.getCurrentUser();
    expect(user?.name).toBe('Pending');
    expect(user?.lastName).toBe('User');
    expect(localStorage.getItem('pending_name')).toBeNull();
  });
});
