import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PromoService } from './promo.service';

describe('PromoService', () => {
  let service: PromoService;
  let httpMock: HttpTestingController;

  const API = 'http://localhost:8222/api/promos';
  const PAY = 'http://localhost:8222/api/payments';

  const mockPromo = {
    id: 1,
    code: 'WELCOME10',
    discountPercent: 10,
    active: true,
    maxUses: 100,
    currentUses: 5
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PromoService]
    });
    service = TestBed.inject(PromoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── getAllPromos ────────────────────────────────────────────
  it('should GET all promos', () => {
    service.getAllPromos().subscribe(promos => {
      expect(promos.length).toBe(1);
      expect(promos[0].code).toBe('WELCOME10');
    });
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush([mockPromo]);
  });

  // ─── getPromoById ────────────────────────────────────────────
  it('should GET promo by id', () => {
    service.getPromoById(1).subscribe(p => expect(p.id).toBe(1));
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPromo);
  });

  // ─── createPromo ─────────────────────────────────────────────
  it('should POST to create promo', () => {
    service.createPromo({ code: 'NEWPROMO', discountPercent: 15 } as any).subscribe();
    const req = httpMock.expectOne(API);
    expect(req.request.method).toBe('POST');
    req.flush(mockPromo);
  });

  // ─── updatePromo ─────────────────────────────────────────────
  it('should PUT to update promo', () => {
    service.updatePromo(1, { discountPercent: 20 }).subscribe();
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockPromo, discountPercent: 20 });
  });

  // ─── deletePromo ─────────────────────────────────────────────
  it('should DELETE promo', () => {
    service.deletePromo(1).subscribe();
    const req = httpMock.expectOne(`${API}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  // ─── togglePromo ─────────────────────────────────────────────
  it('should PATCH to toggle promo', () => {
    service.togglePromo(1).subscribe();
    const req = httpMock.expectOne(`${API}/1/toggle`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockPromo, active: false });
  });

  // ─── validatePromoCode ───────────────────────────────────────
  it('should GET to validate promo code', () => {
    service.validatePromoCode('WELCOME10').subscribe();
    const req = httpMock.expectOne(`${PAY}/promo/validate/WELCOME10`);
    expect(req.request.method).toBe('GET');
    req.flush({ valid: true });
  });

  // ─── applyPromoCode ──────────────────────────────────────────
  it('should POST to apply promo code', () => {
    service.applyPromoCode('WELCOME10').subscribe();
    const req = httpMock.expectOne(`${PAY}/promo/apply/WELCOME10`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });
  });

  // ─── getStats ────────────────────────────────────────────────
  it('should GET promo stats', () => {
    service.getStats().subscribe(stats => expect(stats).toBeTruthy());
    const req = httpMock.expectOne(`${API}/stats`);
    expect(req.request.method).toBe('GET');
    req.flush({ totalPromos: 10, activePromos: 7 });
  });

  // ─── generateAIPromo ─────────────────────────────────────────
  it('should POST generateAIPromo with correct query params', () => {
    service.generateAIPromo('FREELANCER', 20, 50, 30).subscribe();
    const req = httpMock.expectOne(r =>
      r.url === `${API}/ai/generate` &&
      r.params.get('targetType') === 'FREELANCER' &&
      r.params.get('discount') === '20' &&
      r.params.get('maxUses') === '50' &&
      r.params.get('validDays') === '30'
    );
    expect(req.request.method).toBe('POST');
    req.flush({ code: 'AI-PROMO-XYZ' });
  });

  // ─── getAIRecommendations — fallback to demo ─────────────────
  it('should fall back to demo recommendations on HTTP error', (done) => {
    service.getAIRecommendations('FREELANCER').subscribe(res => {
      expect(res.success).toBeTrue();
      expect(res.recommendations.length).toBeGreaterThan(0);
      done();
    });
    const req = httpMock.expectOne(r => r.url.includes('/ai/recommend'));
    req.error(new ProgressEvent('error'));
  });

  // ─── getAIRecommendations — success path ─────────────────────
  it('should GET AI recommendations successfully', () => {
    service.getAIRecommendations('CLIENT', 'PRO', 5).subscribe(res => {
      expect(res.totalFound).toBe(2);
    });
    const req = httpMock.expectOne(r => r.url.includes('/ai/recommend'));
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, recommendations: [{}, {}], totalFound: 2, generatedAt: '', aiModel: 'test' });
  });
});
