import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'tn-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-elevated]': 'elevated()' },
  template: '<ng-content />',
  styles: `
    :host {
      display: block;
      min-width: 0;
      padding: var(--space-6);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    :host([data-elevated='true']) {
      box-shadow: var(--shadow);
    }
  `,
})
export class CardComponent {
  readonly elevated = input(false, { transform: booleanAttribute });
}
