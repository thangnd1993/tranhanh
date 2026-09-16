import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TrafficFineLookupResponse, TrafficFineRecord } from '@tranhanh/shared';
import { ButtonDirective } from '../design-system/button.directive';
import { CardComponent } from '../design-system/card.component';
import { formatDateTime } from '../i18n/format';
import type { Locale } from '../i18n/routes';
import { limitationLabel, statusLabel, trafficFineCopy, vehicleTypeLabel } from './traffic-fine-copy';

@Component({
  selector: 'tn-traffic-fine-result',
  imports: [ButtonDirective, CardComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tn-card
      elevated
      class="status-card"
      [attr.data-outcome]="response().outcome"
    >
      <p class="status-label">
        {{ response().outcome === 'MANUAL_VERIFICATION_REQUIRED' ? copy().manual : copy().sourceTitle }}
      </p>
      <h2>{{ title() }}</h2>
      <p>{{ body() }}</p>
      <dl class="source-grid">
        <div>
          <dt>{{ copy().source }}</dt>
          <dd>{{ response().provider.name }}</dd>
        </div>
        <div>
          <dt>{{ copy().official }}</dt>
          <dd>{{ response().provider.official ? copy().official : '—' }}</dd>
        </div>
        <div>
          <dt>{{ copy().checked }}</dt>
          <dd>{{ checkedTime() }}</dd>
        </div>
        <div>
          <dt>{{ copy().coverage }}</dt>
          <dd>{{ response().provider.geographicCoverage }}</dd>
        </div>
        <div>
          <dt>{{ copy().freshness }}</dt>
          <dd>{{ response().provider.freshness }}</dd>
        </div>
      </dl>
      @if (response().limitations.length) {
        <div class="limitations">
          <h3>{{ copy().limitations }}</h3>
          <ul>
            @for (limitation of response().limitations; track limitation.code) {
              <li>{{ limitationText(limitation) }}</li>
            }
          </ul>
        </div>
      }
      <a
        tnButton
        class="official-link"
        [href]="response().provider.url"
        target="_blank"
        rel="noopener noreferrer"
        >{{ copy().officialCta }} <span aria-hidden="true">↗</span
        ><span class="sr-only"> — {{ copy().external }}</span></a
      >
    </tn-card>
    @if (response().outcome === 'RESULTS_AVAILABLE') {
      <section class="records">
        <h2>{{ copy().resultsTitle }}</h2>
        @for (record of response().results; track record.fingerprint) {
          <tn-card
            ><ng-container
              [ngTemplateOutlet]="recordTemplate"
              [ngTemplateOutletContext]="{ $implicit: record }"
          /></tn-card>
        }
      </section>
    }
    <ng-template
      #recordTemplate
      let-record
    >
      <dl class="record-grid">
        @if (record.violationTime) {
          <div>
            <dt>{{ copy().resultTime }}</dt>
            <dd>{{ record.violationTime }}</dd>
          </div>
        }
        @if (record.violationLocation) {
          <div>
            <dt>{{ copy().resultLocation }}</dt>
            <dd>{{ record.violationLocation }}</dd>
          </div>
        }
        @if (record.violationBehavior) {
          <div>
            <dt>{{ copy().resultBehavior }}</dt>
            <dd>{{ record.violationBehavior }}</dd>
          </div>
        }
        @if (record.detectingAuthority) {
          <div>
            <dt>{{ copy().detectingAuthority }}</dt>
            <dd>{{ record.detectingAuthority }}</dd>
          </div>
        }
        @if (record.processingAuthority) {
          <div>
            <dt>{{ copy().processingAuthority }}</dt>
            <dd>{{ record.processingAuthority }}</dd>
          </div>
        }
        <div>
          <dt>{{ copy().status }}</dt>
          <dd>{{ recordStatus(record) }}</dd>
        </div>
        @if (record.providerStatusText) {
          <div>
            <dt>{{ copy().providerWording }}</dt>
            <dd>{{ record.providerStatusText }}</dd>
          </div>
        }
        @if (record.publicReference) {
          <div>
            <dt>{{ copy().publicReference }}</dt>
            <dd>{{ record.publicReference }}</dd>
          </div>
        }
      </dl>
    </ng-template>
  `,
  styleUrl: './traffic-fine-result.component.scss',
})
export class TrafficFineResultComponent {
  readonly response = input.required<TrafficFineLookupResponse>();
  readonly locale = input.required<Locale>();
  readonly copy = computed(() => trafficFineCopy(this.locale()));
  readonly vehicleType = computed(() => vehicleTypeLabel(this.response().vehicleType, this.locale()));
  readonly checkedTime = computed(() => formatDateTime(new Date(this.response().retrievedAt), this.locale()));
  readonly title = computed(() => {
    const outcome = this.response().outcome;
    return outcome === 'MANUAL_VERIFICATION_REQUIRED'
      ? this.copy().manualTitle
      : outcome === 'UNSUPPORTED'
        ? this.copy().unsupportedTitle
        : outcome === 'NO_MATCHING_RECORDS'
          ? this.copy().noRecordsTitle
          : outcome === 'RESULTS_AVAILABLE'
            ? this.copy().resultsTitle
            : this.copy().unavailable;
  });
  readonly body = computed(() => {
    const outcome = this.response().outcome;
    return outcome === 'MANUAL_VERIFICATION_REQUIRED'
      ? this.copy().manualBody
      : outcome === 'UNSUPPORTED'
        ? this.copy().unsupportedBody
        : outcome === 'NO_MATCHING_RECORDS'
          ? this.copy().noRecordsBody
          : outcome === 'RESULTS_AVAILABLE'
            ? this.copy().sourceTitle
            : this.copy().unavailable;
  });
  limitationText(limitation: Parameters<typeof limitationLabel>[0]) {
    return limitationLabel(limitation, this.locale());
  }
  recordStatus(record: TrafficFineRecord) {
    return statusLabel(record.status, this.locale());
  }
}
