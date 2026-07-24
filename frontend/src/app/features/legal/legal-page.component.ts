import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icons';
import { LegalContentComponent } from '../../shared/legal-content.component';

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink, IconComponent, LegalContentComponent],
  template: `
    <div class="legal-shell" style="min-height:100vh;background:var(--bg);">
      <div style="max-width:720px;margin:0 auto;">
        <a routerLink="/register" style="display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:13px;font-weight:600;text-decoration:none;margin-bottom:20px;">
          <app-icon name="chevronLeft" [size]="14" /> Back
        </a>
        <div class="card legal-card page-enter">
          <app-legal-content [type]="type()" />
        </div>
      </div>
    </div>
  `
})
export class LegalPageComponent {
  type = input<'terms' | 'sla'>('terms');
}
