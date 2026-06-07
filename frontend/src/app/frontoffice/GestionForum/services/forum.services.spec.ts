import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PublicationService } from './publication.service';
import { ReactionService } from './reaction.service';
import { CommentaireService } from './commentaire.service';

const PUB_URL  = 'http://localhost:8222/api/publications';
const REACT_URL = 'http://localhost:8222/api/reactions';
const COM_URL  = 'http://localhost:8222/api/commentaires';

// ═══════════════════════════════════════════════════════════════
// PublicationService
// ═══════════════════════════════════════════════════════════════
describe('PublicationService', () => {
  let service: PublicationService;
  let httpMock: HttpTestingController;

  const mockPub = { id: 1, title: 'Test Post', userId: 42, status: 'ACTIVE' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PublicationService]
    });
    service = TestBed.inject(PublicationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('should GET all publications', () => {
    service.getAllPublications().subscribe(pubs => expect(pubs.length).toBe(1));
    httpMock.expectOne(PUB_URL).flush([mockPub]);
  });

  it('should GET publications by type', () => {
    service.getPublicationsByType('OFFRE' as any).subscribe();
    const req = httpMock.expectOne(`${PUB_URL}/type/OFFRE`);
    expect(req.request.method).toBe('GET');
    req.flush([mockPub]);
  });

  it('should GET publications by userId', () => {
    service.getPublicationsByUserId(42).subscribe();
    httpMock.expectOne(`${PUB_URL}/user/42`).flush([mockPub]);
  });

  it('should GET archived publications by userId', () => {
    service.getArchivedByUserId(42).subscribe();
    httpMock.expectOne(`${PUB_URL}/user/42/archived`).flush([]);
  });

  it('should GET publication by id', () => {
    service.getPublicationById(1).subscribe(p => expect(p.id).toBe(1));
    httpMock.expectOne(`${PUB_URL}/1`).flush(mockPub);
  });

  it('should GET block status for user', () => {
    service.getBlockStatus(42).subscribe(s => expect(s.blocked).toBeFalse());
    const req = httpMock.expectOne(`${PUB_URL}/user/42/block-status`);
    req.flush({ blocked: false, warningCount: 0 });
  });

  it('should POST to signaler a publication with params', () => {
    service.signalerPublication(1, 42, 'spam').subscribe();
    const req = httpMock.expectOne(r =>
      r.url === `${PUB_URL}/1/signaler` &&
      r.params.get('userId') === '42' &&
      r.params.get('raison') === 'spam'
    );
    expect(req.request.method).toBe('POST');
    req.flush(mockPub);
  });

  it('should POST FormData to create publication', () => {
    const fd = new FormData();
    fd.append('title', 'New Post');
    service.createPublication(fd).subscribe();
    const req = httpMock.expectOne(PUB_URL);
    expect(req.request.method).toBe('POST');
    req.flush(mockPub);
  });

  it('should PUT FormData to update publication', () => {
    const fd = new FormData();
    service.updatePublication(1, fd).subscribe();
    const req = httpMock.expectOne(`${PUB_URL}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockPub);
  });

  it('should DELETE publication with userId param', () => {
    service.deletePublication(1, 42).subscribe();
    const req = httpMock.expectOne(r =>
      r.url === `${PUB_URL}/1` && r.params.get('userId') === '42'
    );
    expect(req.request.method).toBe('DELETE');
    req.flush('deleted');
  });
});

// ═══════════════════════════════════════════════════════════════
// ReactionService
// ═══════════════════════════════════════════════════════════════
describe('ReactionService', () => {
  let service: ReactionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReactionService]
    });
    service = TestBed.inject(ReactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('should POST toggleReaction with correct params', () => {
    service.toggleReaction(1, 42, 'LIKE' as any).subscribe();
    const req = httpMock.expectOne(r =>
      r.url === `${REACT_URL}/publication/1` &&
      r.params.get('userId') === '42' &&
      r.params.get('type') === 'LIKE'
    );
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, type: 'LIKE' });
  });

  it('should GET reaction summary with userId param', () => {
    service.getSummary(1, 42).subscribe(s => expect(s).toBeTruthy());
    const req = httpMock.expectOne(r =>
      r.url === `${REACT_URL}/publication/1/summary` &&
      r.params.get('userId') === '42'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ counts: { LIKE: 5 }, userReaction: 'LIKE' });
  });
});

// ═══════════════════════════════════════════════════════════════
// CommentaireService
// ═══════════════════════════════════════════════════════════════
describe('CommentaireService', () => {
  let service: CommentaireService;
  let httpMock: HttpTestingController;

  const mockComment = { id: 1, contenue: 'Nice post!', userId: 42, publicationId: 10, replies: [] };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CommentaireService]
    });
    service = TestBed.inject(CommentaireService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => expect(service).toBeTruthy());

  it('should GET all commentaires', () => {
    service.getAllCommentaires().subscribe(c => expect(c.length).toBe(1));
    httpMock.expectOne(COM_URL).flush([mockComment]);
  });

  it('should GET commentaires by publication id', () => {
    service.getCommentairesByPublicationId(10).subscribe();
    httpMock.expectOne(`${COM_URL}/publication/10`).flush([mockComment]);
  });

  it('should count flat comments correctly', () => {
    service.getCommentCountByPublicationId(10).subscribe(count => expect(count).toBe(1));
    httpMock.expectOne(`${COM_URL}/publication/10`).flush([mockComment]);
  });

  it('should count nested replies recursively', () => {
    const nested = {
      ...mockComment,
      replies: [{ ...mockComment, id: 2, replies: [{ ...mockComment, id: 3, replies: [] }] }]
    };
    service.getCommentCountByPublicationId(10).subscribe(count => expect(count).toBe(3));
    httpMock.expectOne(`${COM_URL}/publication/10`).flush([nested]);
  });

  it('should GET commentaire by id', () => {
    service.getCommentaireById(1).subscribe(c => expect(c.id).toBe(1));
    httpMock.expectOne(`${COM_URL}/1`).flush(mockComment);
  });

  it('should POST createCommentaire with correct params', () => {
    service.createCommentaire('Hello!', 10, 42).subscribe();
    const req = httpMock.expectOne(r =>
      r.url === COM_URL &&
      r.params.get('contenue') === 'Hello!' &&
      r.params.get('publicationId') === '10' &&
      r.params.get('userId') === '42'
    );
    expect(req.request.method).toBe('POST');
    req.flush(mockComment);
  });

  it('should POST replyToCommentaire', () => {
    service.replyToCommentaire('Reply!', 1, 10, 42).subscribe();
    const req = httpMock.expectOne(r =>
      r.url === `${COM_URL}/1/reply` &&
      r.params.get('contenue') === 'Reply!'
    );
    expect(req.request.method).toBe('POST');
    req.flush({ ...mockComment, id: 2 });
  });

  it('should PUT updateCommentaire', () => {
    service.updateCommentaire(1, 'Updated!', 42).subscribe();
    const req = httpMock.expectOne(r =>
      r.url === `${COM_URL}/1` &&
      r.params.get('contenue') === 'Updated!'
    );
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockComment, contenue: 'Updated!' });
  });

  it('should DELETE commentaire with userId param', () => {
    service.deleteCommentaire(1, 42).subscribe();
    const req = httpMock.expectOne(r =>
      r.url === `${COM_URL}/1` && r.params.get('userId') === '42'
    );
    expect(req.request.method).toBe('DELETE');
    req.flush('deleted');
  });

  it('should PUT togglePin with userId param', () => {
    service.togglePin(1, 42).subscribe();
    const req = httpMock.expectOne(r =>
      r.url === `${COM_URL}/1/pin` && r.params.get('userId') === '42'
    );
    expect(req.request.method).toBe('PUT');
    req.flush(mockComment);
  });
});
