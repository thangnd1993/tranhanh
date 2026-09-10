import { LocaleService } from '../i18n/locale.service';
import { formatNumber } from '../i18n/format';
import { ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { Meta } from '@angular/platform-browser';
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
export class ShowcaseComponent implements OnDestroy {
  private readonly meta = inject(Meta);
  protected readonly i18n = inject(LocaleService);
  protected readonly formatNumber = formatNumber;
  protected get breadcrumb() {
    return [
      { label: this.i18n.t('navigation.home'), url: this.i18n.path('home') },
      { label: this.i18n.t('navigation.showcase') },
    ];
  }

  constructor() {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  ngOnDestroy(): void {
    this.meta.removeTag('name="robots"');
  }
}
