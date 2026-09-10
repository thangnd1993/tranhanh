import { ChangeDetectionStrategy, Component, Directive, input } from '@angular/core';
import { IconComponent } from './icon.component';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

@Directive({
  selector: '[tnBadge]',
  host: { class: 'badge', '[attr.data-tone]': 'tone()' },
})
export class BadgeDirective {
  readonly tone = input<Tone>('neutral');
}

@Component({
  selector: 'tn-feedback',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-tone]': 'tone()' },
  template: `
    <tn-icon [name]="tone() === 'success' ? 'check' : 'info'" />
    <div>
      <p class="feedback-title">{{ title() }}</p>
      <div class="feedback-body"><ng-content /></div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-4);
      border-radius: var(--radius-sm);
      background: var(--info-bg);
      color: var(--info);
    }
    tn-icon {
      margin-top: var(--space-1);
    }
    .feedback-title {
      font-weight: 600;
    }
    .feedback-body {
      font-size: var(--text-small);
    }
    :host([data-tone='success']) {
      background: var(--success-bg);
      color: var(--success);
    }
    :host([data-tone='warning']) {
      background: var(--warning-bg);
      color: var(--warning);
    }
    :host([data-tone='danger']) {
      background: var(--danger-bg);
      color: var(--danger);
    }
  `,
})
export class FeedbackComponent {
  readonly tone = input<Exclude<Tone, 'neutral'>>('info');
  readonly title = input.required<string>();
}

@Component({
  selector: 'tn-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status', '[attr.aria-label]': 'label()' },
  template: '<span></span><span></span><span></span>',
  styles: `
    :host {
      display: grid;
      gap: var(--space-3);
    }
    span {
      background: var(--surface-subtle);
      height: 1rem;
      border-radius: var(--radius-sm);
    }
    span:first-child {
      width: 45%;
      height: 1.5rem;
    }
    span:last-child {
      width: 75%;
    }
  `,
})
export class SkeletonComponent {
  readonly label = input('Đang tải nội dung');
}
