import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { VehicleMonitoringResult } from '@tranhanh/shared';
import { GarageService } from './garage.service';
import { VehicleMonitoringComponent } from './vehicle-monitoring.component';

const manual = (enabled = false): VehicleMonitoringResult => ({
  id: 'monitoring-a',
  vehicleId: 'vehicle-a',
  monitoringType: 'TRAFFIC_FINE',
  providerKey: 'csgt-manual',
  providerName: 'CSGT',
  providerUrl: 'https://www.csgt.vn/test',
  enabled,
  effectiveStatus: enabled ? 'ENABLED_BUT_MANUAL' : 'DISABLED',
  capability: 'MANUAL_ONLY',
  automaticChecksAvailable: false,
  limitationCode: enabled ? 'MANUAL_VERIFICATION_REQUIRED' : null,
  lastAttemptAt: null,
  lastSuccessfulCheckAt: null,
  nextEligibleCheckAt: null,
  lastOutcome: null,
  failureCount: 0,
  updatedAt: '2026-09-17T00:00:00Z',
});
describe('vehicle monitoring UI', () => {
  it('shows truthful manual-only copy, empty history, and an accessible preference toggle', async () => {
    const garage = {
      monitoring: vi.fn(async () => manual(true)),
      monitoringHistory: vi.fn(async () => ({ items: [] })),
      enableMonitoring: vi.fn(),
      disableMonitoring: vi.fn(async () => manual(false)),
      message: vi.fn(),
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: GarageService, useValue: garage }] });
    const fixture = TestBed.createComponent(VehicleMonitoringComponent);
    fixture.componentRef.setInput('vehicleId', 'vehicle-a');
    fixture.componentRef.setInput('vehicleStatus', 'ACTIVE');
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Đang tải');
    });
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Theo dõi tự động chưa khả dụng');
    expect(text).toContain('Chưa có lượt kiểm tra tự động');
    const toggle = fixture.nativeElement.querySelector('button[aria-pressed="true"]') as HTMLButtonElement;
    expect(toggle.textContent).toContain('Tắt nhu cầu theo dõi');
    toggle.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(garage.disableMonitoring).toHaveBeenCalledWith('vehicle-a');
  });
  it('disables opt-in for archived vehicles and explains suspension', async () => {
    const garage = {
      monitoring: vi.fn(async () => manual(false)),
      monitoringHistory: vi.fn(async () => ({ items: [] })),
      message: vi.fn(),
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: GarageService, useValue: garage }] });
    const fixture = TestBed.createComponent(VehicleMonitoringComponent);
    fixture.componentRef.setInput('vehicleId', 'vehicle-a');
    fixture.componentRef.setInput('vehicleStatus', 'ARCHIVED');
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
    });
    expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Xe đã lưu trữ');
  });
});
