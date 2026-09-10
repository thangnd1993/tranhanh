import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../design-system/button.directive';
import { CardComponent } from '../design-system/card.component';
import { IconComponent } from '../design-system/icon.component';

@Component({
  selector: 'tn-home',
  imports: [RouterLink, ButtonDirective, CardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container section home-intro">
      <p class="eyebrow">TRA NHANH · HIỂU RÕ</p>
      <h1 class="display">Cần biết gì,<br />tra ngay.</h1>
      <p class="muted">Một nơi cho những điều bạn cần biết mỗi ngày.</p>
      <a
        tnButton
        routerLink="/design-system"
        size="large"
      >
        Khám phá bộ giao diện <tn-icon name="arrow" />
      </a>
      <p class="caption">TraNhanh đang được xây dựng. Các tiện ích sẽ sớm có mặt.</p>
    </section>
    <section
      aria-label="Các nhóm tiện ích đang phát triển"
      class="container section grid grid--three"
    >
      @for (category of categories; track category.title) {
        <tn-card>
          <div class="stack">
            <tn-icon [name]="category.icon" />
            <h2>{{ category.title }}</h2>
            <p class="muted small">{{ category.description }}</p>
            <span class="caption">Đang phát triển</span>
          </div>
        </tn-card>
      }
    </section>
  `,
  styles: `
    .home-intro {
      max-width: 45rem;
      text-align: center;
      display: grid;
      justify-items: center;
      gap: var(--space-6);
    }
    h1 {
      margin-block: var(--space-2);
    }
    h2 {
      font-size: var(--text-card);
    }
    tn-icon {
      color: var(--brand);
    }
    a tn-icon {
      color: inherit;
    }
  `,
})
export class HomeComponent {
  protected readonly categories = [
    { title: 'Tra cứu', description: 'Thông tin rõ ràng, dễ tìm.', icon: 'search' },
    { title: 'Công cụ', description: 'Những tiện ích nhỏ cho công việc hằng ngày.', icon: 'tool' },
    { title: 'Hôm nay', description: 'Thông tin hữu ích cho một ngày mới.', icon: 'sun' },
  ] as const;
}
