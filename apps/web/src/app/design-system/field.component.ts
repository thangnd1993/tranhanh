import { ChangeDetectionStrategy, Component, Directive, inject, input } from '@angular/core';

@Component({
  selector: 'tn-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [for]="controlId()">{{ label() }}</label>
    <div class="field-control"><ng-content /></div>
    @if (error()) {
      <p
        class="field-error"
        [id]="controlId() + '-message'"
      >
        {{ error() }}
      </p>
    } @else if (hint()) {
      <p [id]="controlId() + '-message'">{{ hint() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-width: 0;
    }
    label {
      font-size: var(--text-small);
      font-weight: 600;
    }
    p {
      font-size: var(--text-caption);
      color: var(--text-secondary);
    }
    .field-error {
      color: var(--danger);
    }
    .field-control {
      min-width: 0;
    }
  `,
})
export class FieldComponent {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly error = input('');
}

@Directive({
  selector: 'input[tnControl], select[tnControl], textarea[tnControl]',
  host: {
    class: 'control',
    '[attr.id]': 'field?.controlId() ?? null',
    '[attr.aria-invalid]': 'field?.error() ? "true" : null',
    '[attr.aria-describedby]': 'messageId()',
  },
})
export class ControlDirective {
  protected readonly field = inject(FieldComponent, { optional: true });
  protected messageId(): string | null {
    return this.field && (this.field.error() || this.field.hint()) ? this.field.controlId() + '-message' : null;
  }
}
