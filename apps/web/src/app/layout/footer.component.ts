import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'tn-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="container">
      <div class="footer-main">
        <div class="stack">
          <a
            class="footer-brand"
            routerLink="/"
            >TraNhanh<span> / </span></a
          >
          <p class="muted small">Cần biết gì, tra ngay.</p>
          <p class="caption">Tra cứu và tiện ích cho mỗi ngày.</p>
        </div>
        <div class="footer-groups">
          <div class="stack">
            <h2>Khám phá</h2>
            <span>Tra cứu · Sắp có</span>
            <span>Công cụ · Sắp có</span>
            <span>Hôm nay · Sắp có</span>
          </div>
          <div class="stack">
            <h2>Về TraNhanh</h2>
            <span>Giới thiệu · Sắp có</span>
            <span>Nguồn dữ liệu · Sắp có</span>
            <a routerLink="/design-system">Bộ giao diện</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom caption">
        <span>TraNhanh · Đang phát triển</span>
        <span>Điều khoản · Quyền riêng tư: đang chuẩn bị</span>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: block;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .footer-main {
      display: grid;
      gap: var(--space-10);
      padding-block: var(--space-10);
    }
    .footer-brand {
      font-size: 1.5rem;
      font-weight: 750;
      text-decoration: none;
      color: var(--text-primary);
    }
    .footer-brand span {
      color: var(--brand);
    }
    h2 {
      font-size: var(--text-small);
    }
    .footer-groups {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-6);
    }
    .footer-groups span {
      font-size: var(--text-caption);
      color: var(--text-muted);
    }
    .footer-groups a {
      font-size: var(--text-caption);
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    .footer-bottom {
      border-top: 1px solid var(--border);
      padding-block: var(--space-6);
    }
    .footer-bottom {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
    }
    @media (min-width: 48rem) {
      .footer-main {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class FooterComponent {}
