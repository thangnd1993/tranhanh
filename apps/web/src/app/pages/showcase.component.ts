import { SeoService } from '../seo/seo.service';
import { LocaleService } from '../i18n/locale.service';
import { formatNumber } from '../i18n/format';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BreadcrumbComponent } from '../design-system/breadcrumb.component';
import { ButtonDirective } from '../design-system/button.directive';
import { CardComponent } from '../design-system/card.component';
import { BadgeDirective, FeedbackComponent, SkeletonComponent } from '../design-system/feedback.component';
import { ControlDirective, FieldComponent } from '../design-system/field.component';
import { IconComponent } from '../design-system/icon.component';

@Component({
  selector: 'tn-showcase',
  imports: [
    BadgeDirective,
    BreadcrumbComponent,
    ButtonDirective,
    CardComponent,
    ControlDirective,
    FeedbackComponent,
    FieldComponent,
    IconComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.scss',
})
export class ShowcaseComponent {
  protected readonly seo = inject(SeoService);
  protected readonly i18n = inject(LocaleService);
  protected readonly formatNumber = formatNumber;
  protected get breadcrumb() {
    return this.seo.active()?.breadcrumbs ?? [];
  }
}
