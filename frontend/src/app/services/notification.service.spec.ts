import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [NotificationService] });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call console.log on success()', () => {
    spyOn(console, 'log');
    service.success('Operation done');
    expect(console.log).toHaveBeenCalledWith('✅ Success:', 'Operation done');
  });

  it('should call console.error on error()', () => {
    spyOn(console, 'error');
    service.error('Something failed');
    expect(console.error).toHaveBeenCalledWith('❌ Error:', 'Something failed');
  });

  it('should call console.log on info()', () => {
    spyOn(console, 'log');
    service.info('Just info');
    expect(console.log).toHaveBeenCalledWith('ℹ️ Info:', 'Just info');
  });

  it('should call console.warn on warning()', () => {
    spyOn(console, 'warn');
    service.warning('Watch out');
    expect(console.warn).toHaveBeenCalledWith('⚠️ Warning:', 'Watch out');
  });

  it('should not throw when called with empty string', () => {
    expect(() => service.success('')).not.toThrow();
    expect(() => service.error('')).not.toThrow();
    expect(() => service.info('')).not.toThrow();
    expect(() => service.warning('')).not.toThrow();
  });
});
