import { LocaleService } from '../i18n/locale.service';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from './icon.component';

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

@Component({
  selector: 'tn-breadcrumb',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav [attr.aria-label]="i18n.t('navigation.breadcrumb')">
      <ol>
        @for (item of items(); track $index; let last = $last) {
          <li>
            @if (last || !item.url) {
              <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
            } @else {
              <a [routerLink]="item.url">{{ item.label }}</a>
              <tn-icon name="chevron" />
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      padding: 0;
      margin: 0;
      list-style: none;
    }
    li {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      font-size: var(--text-small);
    }
    span {
      color: var(--text-secondary);
    }
    a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
    }
    tn-icon {
      color: var(--text-muted);
      width: 0.875rem;
    }
  `,
})
export class BreadcrumbComponent {
  protected readonly i18n = inject(LocaleService);
  readonly items = input.required<readonly BreadcrumbItem[]>();
}
