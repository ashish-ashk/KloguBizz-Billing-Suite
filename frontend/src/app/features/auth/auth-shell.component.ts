import { Component, OnInit, input, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { PublicBranding } from '../../core/models';
import { IconComponent } from '../../shared/icons';
import { ToastsComponent } from '../../shared/ui';

/**
 * Chrome for the standalone auth utility pages — accept invite, forgot
 * password, reset password.
 *
 * Login and register keep their own bespoke marketing panels; these three are
 * short, task-focused screens that would only diverge if each rebuilt the
 * layout, so they share it. Content goes in the default slot.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [IconComponent, ToastsComponent],
  template: `
    <app-toasts />
    <div class="auth-page">
      <section class="auth-panel page-enter">
        <div style="max-width:380px;width:100%;margin:0 auto;">
          <div class="brand" style="margin-bottom:30px;">
            @if (branding()?.logoUrl) {
              <img [src]="branding()?.logoUrl" alt="Logo" style="width:36px;height:36px;border-radius:10px;object-fit:contain;flex-shrink:0;" />
            } @else {
              <img src="klogu-logo.png" alt="Klogu Bizz" style="width:36px;height:36px;border-radius:10px;object-fit:contain;flex-shrink:0;" />
            }
            <div>
              <div class="brand-name" style="color:var(--text)">{{ branding()?.appName || 'Klogu Bizz' }}</div>
              <div class="brand-sub" style="color:var(--muted)">{{ branding()?.tagline || 'GST Billing Suite' }}</div>
            </div>
          </div>

          @if (eyebrow()) {
            <div class="auth-eyebrow"><app-icon [name]="eyebrowIcon()" [size]="11" /> {{ eyebrow() }}</div>
          }
          <h1 style="margin:0 0 6px;font-size:25px;letter-spacing:-0.4px;">{{ heading() }}</h1>
          @if (subheading()) {
            <p style="margin:0 0 26px;color:var(--muted);font-size:14px;line-height:1.6;">{{ subheading() }}</p>
          }

          <ng-content />
        </div>
      </section>

      <section class="auth-art"
        [style.background]="'linear-gradient(135deg,' + (branding()?.primaryColor || '#1e1b4b') + ' 0%,' + (branding()?.secondaryColor || '#312e81') + ' 55%,' + (branding()?.accentColor || '#4f46e5') + ' 100%)'">
        <div>
          <h2>{{ artHeading() }}</h2>
          <p>{{ artBody() }}</p>
          <div class="auth-trust">
            <span><app-icon name="shield" [size]="13" /> Isolated data per organisation</span>
            <span><app-icon name="lock" [size]="13" /> Encrypted credentials</span>
            <span><app-icon name="checkCircle" [size]="13" /> Built for Indian GST</span>
          </div>
        </div>
      </section>
    </div>
  `
})
export class AuthShellComponent implements OnInit {
  eyebrow = input('');
  eyebrowIcon = input('lock');
  heading = input('');
  subheading = input('');
  artHeading = input('Billing software your team will actually trust.');
  artBody = input(
    'Every invoice computes CGST, SGST and IGST server-side from state codes — no manual tax math, no spreadsheet drift.'
  );

  branding = signal<PublicBranding | null>(null);

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Best-effort: these pages must still render if the branding call fails,
    // because they are the only route back in for a locked-out user.
    this.api.publicBranding().subscribe({
      next: b => this.branding.set(b),
      error: () => {}
    });
  }
}
