import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ShellComponent } from './shell.component';

describe('AppComponent', () => {
  it('renders the shared public shell', async () => {
    await TestBed.configureTestingModule({ providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tn-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tn-footer')).not.toBeNull();
  });
});
