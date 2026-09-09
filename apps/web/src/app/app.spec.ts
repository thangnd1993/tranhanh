import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app';

describe('AppComponent', () => {
  it('renders the Vietnamese product tagline', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Cần biết gì, tra ngay.');
  });
});
