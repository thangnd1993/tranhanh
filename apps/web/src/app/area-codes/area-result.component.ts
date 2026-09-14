import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../design-system/card.component';
import { BadgeDirective } from '../design-system/feedback.component';
import { areaPath, Locale } from '../i18n/routes';
import { areaAnswer, areaCopy } from './area-copy';
import { AreaCodeResult } from './area-data';
@Component({
  selector: 'tn-area-result',
  imports: [RouterLink, CardComponent, BadgeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './area-result.component.scss',
  template: ` <tn-card class="answer-card">
      <span
        tnBadge
        [tone]="row().status === 'ACTIVE' ? 'success' : 'neutral'"
        >{{ copy()[row().status] }}</span
      >
      <p class="answer">{{ answer() }}</p>
      <dl>
        <div>
          <dt>{{ row().status === 'LEGACY' ? copy().old : copy().code }}</dt>
          <dd>{{ row().code }}</dd>
        </div>
        <div>
          <dt>{{ copy().locality }}</dt>
          <dd>{{ row().locality.name }}</dd>
        </div>
        @if (row().replacement; as replacement) {
          <div>
            <dt>{{ copy().current }}</dt>
            <dd>
              <a [routerLink]="path(replacement.newCode)">{{ replacement.newCode }}</a>
            </dd>
          </div>
        }
        <div>
          <dt>{{ copy().status }}</dt>
          <dd>{{ copy()[row().status] }}</dd>
        </div>
      </dl>
      @if (row().replacement; as replacement) {
        @if (replacement.effectiveDate) {
          <p class="small muted">{{ copy().changed }}: {{ date(replacement.effectiveDate) }}</p>
        }
        <a
          class="current-link"
          [routerLink]="path(replacement.newCode)"
          >{{ copy().view }} {{ replacement.newCode }} →</a
        >
      }
      <p class="small muted context">{{ copy().disclaimer }}</p>
    </tn-card>
    <tn-card class="source-card">
      <h2>{{ copy().source }}</h2>
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
        @if (row().source.publishedAt; as published) {
          <div>
            <dt>{{ copy().published }}</dt>
            <dd>
              <time [attr.datetime]="published">{{ date(published) }}</time>
            </dd>
          </div>
        }
        @if (row().effectiveFrom; as effective) {
          <div>
            <dt>{{ copy().effective }}</dt>
            <dd>{{ date(effective) }}</dd>
          </div>
        }
        @if (row().effectiveTo; as effective) {
          <div>
            <dt>{{ copy().effectiveTo }}</dt>
            <dd>{{ date(effective) }}</dd>
          </div>
        }
        <div>
          <dt>{{ copy().retrieved }}</dt>
          <dd>
            <time [attr.datetime]="row().source.retrievedAt">{{ date(row().source.retrievedAt) }}</time>
          </dd>
        </div>
        <div>
          <dt>{{ copy().recordUpdated }}</dt>
          <dd>{{ date(row().updatedAt) }}</dd>
        </div>
      </dl>
      <p class="small muted">{{ copy().evidence }}</p>
    </tn-card>`,
})
export class AreaResultComponent {
  readonly row = input.required<AreaCodeResult>();
  readonly locale = input.required<Locale>();
  readonly copy = computed(() => areaCopy(this.locale()));
  readonly answer = computed(() => areaAnswer(this.row(), this.locale()));
  path(code: string) {
    return areaPath(this.locale(), code);
  }
  date(value: string) {
    return new Intl.DateTimeFormat(this.locale() === 'vi' ? 'vi-VN' : 'en-GB', {
      dateStyle: 'medium',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(value));
  }
}
