import { booleanAttribute, Directive, input } from '@angular/core';

@Directive({
  selector: 'button[tnButton], a[tnButton]',
  host: {
    class: 'button',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.aria-busy]': 'loading() ? "true" : null',
    '[attr.disabled]': 'disabled() || loading() ? "" : null',
  },
})
export class ButtonDirective {
  readonly variant = input<'primary' | 'secondary' | 'ghost' | 'danger'>('primary');
  readonly size = input<'small' | 'medium' | 'large' | 'icon'>('medium');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
}
