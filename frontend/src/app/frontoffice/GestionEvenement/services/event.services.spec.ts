import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventService } from './event.service';
import { InscriptionService } from './inscription.service';
import { ActivityService } from './activity.service';

const EVENT_URL = 'http://localhost:8222/api/events';
const INSC_URL  = 'http://localhost:8222/api/inscriptions';
const ACT_URL   = 'http://localhost:8222/api/activities';

// ═══════════════════════════════════════════════════════════════
// EventService
// ═══════════════════════════════════════════════════════════════
describe('EventService', () => {
  let service: EventService;
  let httpMock: HttpTestingController;

  const mockEvent = { idEvent: 1, title: 'Angular Summit', status: 'ACTIVE', category: 'TECH' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EventService]
    });
    service = TestBed.inject(EventService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('should GET all events', () => {
    service.getAllEvents().subscribe(events => expect(events.length).toBe(1));
    httpMock.expectOne(EVENT_URL).flush([mockEvent]);
  });

  it('should GET event by id', () => {
    service.getEventById(1).subscribe(e => expect(e.idEvent).toBe(1));
    httpMock.expectOne(`${EVENT_URL}/1`).flush(mockEvent);
  });

  it('should POST to create event', () => {
    service.createEvent({ title: 'New Event' }).subscribe();
    const req = httpMock.expectOne(EVENT_URL);
    expect(req.request.method).toBe('POST');
    req.flush(mockEvent);
  });

  it('should PUT to update event', () => {
    service.updateEvent(1, { title: 'Updated' }).subscribe();
    const req = httpMock.expectOne(`${EVENT_URL}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockEvent, title: 'Updated' });
  });

  it('should DELETE to archive event', () => {
    service.archiveEvent(1).subscribe();
    const req = httpMock.expectOne(`${EVENT_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should GET archived events', () => {
    service.getArchivedEvents().subscribe(events => expect(events).toBeTruthy());
    httpMock.expectOne(`${EVENT_URL}/archived`).flush([]);
  });

  it('should PUT to restore event', () => {
    service.restoreEvent(1).subscribe();
    const req = httpMock.expectOne(`${EVENT_URL}/1/restore`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);
  });

  it('should GET filterEvents with default pagination params', () => {
    service.filterEvents({ category: 'TECH' }).subscribe();
    const req = httpMock.expectOne(r =>
      r.url === `${EVENT_URL}/filter` &&
      r.params.get('category') === 'TECH' &&
      r.params.get('page') === '0' &&
      r.params.get('size') === '10'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [mockEvent], totalElements: 1, currentPage: 0, totalPages: 1 });
  });

  it('should NOT set undefined filter params', () => {
    service.filterEvents({ status: 'ACTIVE' }).subscribe();
    const req = httpMock.expectOne(r => r.url === `${EVENT_URL}/filter`);
    expect(req.request.params.has('titleContains')).toBeFalse();
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush({ content: [], totalElements: 0, currentPage: 0, totalPages: 0 });
  });
});

// ═══════════════════════════════════════════════════════════════
// InscriptionService
// ═══════════════════════════════════════════════════════════════
describe('InscriptionService', () => {
  let service: InscriptionService;
  let httpMock: HttpTestingController;

  const mockInscription = { id: 1, eventId: 10, userId: 42, status: 'PENDING' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [InscriptionService]
    });
    service = TestBed.inject(InscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('should POST to submit inscription', () => {
    service.submitInscription({ eventId: 10, userId: 42 } as any).subscribe();
    const req = httpMock.expectOne(INSC_URL);
    expect(req.request.method).toBe('POST');
    req.flush(mockInscription);
  });

  it('should GET inscriptions by userId', () => {
    service.getMesInscriptions(42).subscribe();
    httpMock.expectOne(`${INSC_URL}/user/42`).flush([mockInscription]);
  });

  it('should GET inscriptions by eventId', () => {
    service.getInscriptionsByEvent(10).subscribe();
    httpMock.expectOne(`${INSC_URL}/event/10`).flush([mockInscription]);
  });

  it('should GET pending inscriptions', () => {
    service.getPendingInscriptions(10).subscribe();
    httpMock.expectOne(`${INSC_URL}/event/10/pending`).flush([mockInscription]);
  });

  it('should PUT to accept inscription', () => {
    service.acceptInscription(1).subscribe();
    const req = httpMock.expectOne(`${INSC_URL}/1/accept`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockInscription, status: 'ACCEPTED' });
  });

  it('should PUT to reject inscription', () => {
    service.rejectInscription(1).subscribe();
    const req = httpMock.expectOne(`${INSC_URL}/1/reject`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockInscription, status: 'REJECTED' });
  });

  it('should DELETE inscription', () => {
    service.deleteInscription(1).subscribe();
    const req = httpMock.expectOne(`${INSC_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should GET badge as blob', () => {
    service.downloadBadge(1).subscribe(blob => expect(blob).toBeTruthy());
    const req = httpMock.expectOne(`${INSC_URL}/1/badge`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });

  it('should PUT to cancel inscription', () => {
    service.cancelInscription(1).subscribe();
    const req = httpMock.expectOne(`${INSC_URL}/1/cancel`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockInscription, status: 'CANCELLED' });
  });

  it('should GET waitlist for event', () => {
    service.getWaitlist(10).subscribe();
    httpMock.expectOne(`${INSC_URL}/event/10/waitlist`).flush([]);
  });

  it('should PUT to increase capacity', () => {
    service.increaseCapacity(10, 50).subscribe();
    const req = httpMock.expectOne(`${INSC_URL}/event/10/capacity?newCapacity=50`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should GET capacity status for event', () => {
    service.getCapacityStatus(10).subscribe(s => expect(s.eventId).toBe(10));
    const req = httpMock.expectOne(`${INSC_URL}/event/10/capacity-status`);
    req.flush({ eventId: 10, capacity: 100, confirmedParticipants: 80, waitlistSize: 5, isFull: false, isBeforeDeadline: true });
  });
});

// ═══════════════════════════════════════════════════════════════
// ActivityService
// ═══════════════════════════════════════════════════════════════
describe('ActivityService', () => {
  let service: ActivityService;
  let httpMock: HttpTestingController;

  const mockActivity = { id: 1, name: 'Workshop', eventId: 10, startTime: '09:00' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ActivityService]
    });
    service = TestBed.inject(ActivityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('should GET activities by event', () => {
    service.getActivitiesByEvent(10).subscribe(a => expect(a.length).toBe(1));
    httpMock.expectOne(`${ACT_URL}/event/10`).flush([mockActivity]);
  });

  it('should POST to create activity', () => {
    service.createActivity(mockActivity as any).subscribe();
    const req = httpMock.expectOne(ACT_URL);
    expect(req.request.method).toBe('POST');
    req.flush(mockActivity);
  });

  it('should PUT to update activity', () => {
    service.updateActivity(1, { ...mockActivity, name: 'Updated' } as any).subscribe();
    const req = httpMock.expectOne(`${ACT_URL}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockActivity, name: 'Updated' });
  });

  it('should DELETE activity', () => {
    service.deleteActivity(1).subscribe();
    const req = httpMock.expectOne(`${ACT_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
