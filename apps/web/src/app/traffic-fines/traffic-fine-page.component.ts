import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { TrafficFineLookupResponse, TrafficFineVehicleType } from '@tranhanh/shared';
import { BreadcrumbComponent } from '../design-system/breadcrumb.component';
import { ButtonDirective } from '../design-system/button.directive';
import { CardComponent } from '../design-system/card.component';
import { ControlDirective, FieldComponent } from '../design-system/field.component';
import { LocaleService } from '../i18n/locale.service';
import { SeoService } from '../seo/seo.service';
import { TrafficFineApi } from './traffic-fine-api.service';
import { trafficFineCopy } from './traffic-fine-copy';
import { TrafficFineApiError } from './traffic-fine-data';
import { TrafficFineResultComponent } from './traffic-fine-result.component';

export const OFFICIAL_TRAFFIC_FINE_URL = 'https://www.csgt.vn/tra-cuu-phuong-tien-vi-pham.html';

@Component({
  selector: 'tn-traffic-fine-page',
  imports: [
    BreadcrumbComponent,
    ButtonDirective,
    CardComponent,
    ControlDirective,
    FieldComponent,
    TrafficFineResultComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './traffic-fine-page.component.html',
  styleUrl: './traffic-fine-page.component.scss',
})
export class TrafficFinePageComponent {
  readonly i18n = inject(LocaleService);
  readonly seo = inject(SeoService);
  readonly copy = computed(() => trafficFineCopy(this.i18n.locale()));
  readonly pending = signal(false);
  readonly response = signal<TrafficFineLookupResponse | null>(null);
  readonly error = signal<'invalid' | 'rateLimited' | 'unavailable' | null>(null);
  readonly officialUrl = OFFICIAL_TRAFFIC_FINE_URL;
  private readonly api = inject(TrafficFineApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resultStatus = viewChild<ElementRef<HTMLElement>>('resultStatus');
  private activeRequest: AbortController | null = null;
  private requestId = 0;

  constructor() {
    this.destroyRef.onDestroy(() => this.activeRequest?.abort());
  }

  async submit(event: Event, plateInput: HTMLInputElement, typeInput: HTMLSelectElement): Promise<void> {
    event.preventDefault();
    const licensePlate = plateInput.value.trim();
    const vehicleType = typeInput.value as TrafficFineVehicleType;
    plateInput.value = '';
    this.activeRequest?.abort();
    const controller = new AbortController();
    this.activeRequest = controller;
    const id = ++this.requestId;
    this.response.set(null);
    this.error.set(null);
    if (!licensePlate) {
      this.error.set('invalid');
      this.focusResult();
      return;
    }
    this.pending.set(true);
    try {
      const response = await this.api.lookup({ licensePlate, vehicleType }, controller.signal);
      if (id === this.requestId) this.response.set(response);
    } catch (error) {
      if (controller.signal.aborted || id !== this.requestId) return;
      this.error.set(
        error instanceof TrafficFineApiError && error.status === 400
          ? 'invalid'
          : error instanceof TrafficFineApiError && error.status === 429
            ? 'rateLimited'
            : 'unavailable',
      );
    } finally {
      if (id === this.requestId) {
        this.pending.set(false);
        this.activeRequest = null;
        this.focusResult();
      }
    }
  }

  retry(): void {
    this.error.set(null);
  }

  private focusResult(): void {
    setTimeout(() => this.resultStatus()?.nativeElement.focus());
  }
}
