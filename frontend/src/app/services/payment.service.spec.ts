import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  const BASE = 'http://localhost:8222/api/payments';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PaymentService]
    });
    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── validatePromoCode ───────────────────────────────────────
  it('should GET promo validation endpoint', () => {
    service.validatePromoCode('WELCOME10').subscribe(res => {
      expect(res.valid).toBeTrue();
    });
    const req = httpMock.expectOne(`${BASE}/promo/validate/WELCOME10`);
    expect(req.request.method).toBe('GET');
    req.flush({ valid: true, discountPercent: 10, message: 'OK' });
  });

  it('should return invalid for unknown promo code', () => {
    service.validatePromoCode('INVALID').subscribe(res => {
      expect(res.valid).toBeFalse();
    });
    const req = httpMock.expectOne(`${BASE}/promo/validate/INVALID`);
    req.flush({ valid: false, message: 'Code introuvable' });
  });

  // ─── applyPromoCode ──────────────────────────────────────────
  it('should POST to apply promo code', () => {
    service.applyPromoCode('PRO50').subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const req = httpMock.expectOne(`${BASE}/promo/apply/PRO50`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, discountPercent: 50 });
  });

  // ─── simulatePayment ─────────────────────────────────────────
  it('should POST payment simulation with correct body', () => {
    const payload = { amount: 29.99, planName: 'Pro', userId: 42 };
    service.simulatePayment(payload).subscribe(res => {
      expect(res.success).toBeTrue();
      expect(res.transactionId).toBeDefined();
    });
    const req = httpMock.expectOne(`${BASE}/simulate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, transactionId: 'TXN-123', message: 'OK', paymentMethod: 'CREDIT_CARD' });
  });

  // ─── downloadInvoice ─────────────────────────────────────────
  it('should GET invoice as blob', () => {
    service.downloadInvoice(7).subscribe(blob => {
      expect(blob).toBeTruthy();
    });
    const req = httpMock.expectOne(`${BASE}/invoice/7`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });
});
