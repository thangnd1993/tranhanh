import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CardComponent } from '../design-system/card.component';
import { BadgeDirective } from '../design-system/feedback.component';
import { Locale } from '../i18n/routes';
import { vehicleAnswer, vehicleCopy } from './vehicle-copy';
import { VehicleRow } from './vehicle-data';
@Component({
  selector: 'tn-vehicle-result',
  imports: [CardComponent, BadgeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './vehicle-result.component.scss',
  template: ` <tn-card class="answer-card"
      ><span
        tnBadge
        tone="success"
        >{{ copy()[row().status] }}</span
      >
      <p class="answer">{{ answer() }}</p>
      <dl>
        <div>
          <dt>{{ copy().code }}</dt>
          <dd>{{ row().numericPrefix }}</dd>
        </div>
        <div>
          <dt>{{ copy().locality }}</dt>
          <dd>{{ row().target.name }}</dd>
        </div>
      </dl>
      <p class="small muted">{{ copy().disclaimer }}</p></tn-card
    >
    @if (row().previousTargets.length) {
      <tn-card
        ><h2>{{ copy().history }}</h2>
        @for (h of row().previousTargets; track h.previousTarget.key) {
          <p>
            <strong>{{ h.previousTarget.name }}</strong> — {{ copy().until }} {{ date(h.effectiveTo) }}
          </p>
          <p>
            <a
              [href]="h.source.url"
              rel="noreferrer"
              >{{ h.source.title || h.source.publisher }}</a
            >
          </p>
          <p>
            <a
              [href]="h.transitionSource.url"
              rel="noreferrer"
              >{{ h.transitionSource.title || h.transitionSource.publisher }}</a
            >
          </p>
        }
        <p class="small muted">{{ copy().historyNote }}</p></tn-card
      >
    }
    <tn-card class="source-card"
      ><h2>{{ copy().source }}</h2>
      <p class="publisher">{{ row().source.publisher }}</p>
      @if (row().source.url; as url) {
        <a
          class="source-link"
          [href]="url"
          rel="noreferrer"
          >{{ row().source.title || row().source.publisher }}</a
        >
      }
      <dl class="dates">
        @if (row().source.publishedAt; as dateValue) {
          <div>
            <dt>{{ copy().published }}</dt>
            <dd>{{ date(dateValue) }}</dd>
          </div>
        }
        @if (row().effectiveFrom; as dateValue) {
          <div>
            <dt>{{ copy().effective }}</dt>
            <dd>{{ date(dateValue) }}</dd>
          </div>
        }
        <div>
          <dt>{{ copy().retrieved }}</dt>
          <dd>{{ date(row().source.retrievedAt) }}</dd>
        </div>
        <div>
          <dt>{{ copy().recordUpdated }}</dt>
          <dd>{{ date(row().updatedAt) }}</dd>
        </div>
      </dl>
      <p class="small muted">{{ copy().evidence }}</p></tn-card
    >`,
})
export class VehicleResultComponent {
  readonly row = input.required<VehicleRow>();
  readonly locale = input.required<Locale>();
  readonly copy = computed(() => vehicleCopy(this.locale()));
  readonly answer = computed(() => vehicleAnswer(this.row(), this.locale()));
  date(value: string) {
    return new Intl.DateTimeFormat(this.locale() === 'vi' ? 'vi-VN' : 'en-GB', {
      dateStyle: 'medium',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(value));
  }
}
