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
  protected readonly breadcrumb = [{ label: 'Trang chủ', url: '/' }, { label: 'Bộ giao diện' }];

  constructor() {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  ngOnDestroy(): void {
    this.meta.removeTag('name="robots"');
  }
}
