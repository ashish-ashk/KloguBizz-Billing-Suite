import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * Small hand-authored stroke-icon set (Lucide/Feather-style: 24x24 grid,
 * 2px rounded stroke, currentColor) so the shell doesn't depend on an
 * external icon font/package — inlined SVGs load instantly and always
 * match the active theme color.
 */
const ICONS: Record<string, string> = {
  menu: `<path d="M4 6h16M4 12h16M4 18h16"/>`,
  chevronLeft: `<path d="m15 18-6-6 6-6"/>`,
  chevronRight: `<path d="m9 18 6-6-6-6"/>`,
  chevronDown: `<path d="m6 9 6 6 6-6"/>`,
  dashboard: `<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>`,
  invoice: `<path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5"/><path d="M8.5 12.5h7M8.5 15.5h5M8.5 9.5h3"/>`,
  calculator: `<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><circle cx="8" cy="11.5" r="1"/><circle cx="12" cy="11.5" r="1"/><circle cx="16" cy="11.5" r="1"/><circle cx="8" cy="15.5" r="1"/><circle cx="12" cy="15.5" r="1"/><circle cx="16" cy="15.5" r="1"/><circle cx="8" cy="19" r="1"/><circle cx="12" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>`,
  users: `<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  creditCard: `<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/>`,
  chart: `<path d="M3 3v16a2 2 0 0 0 2 2h16"/><rect x="7" y="12" width="3" height="6" rx="0.75"/><rect x="12.5" y="8" width="3" height="10" rx="0.75"/><rect x="18" y="5" width="3" height="13" rx="0.75"/>`,
  shieldUser: `<path d="M12 2 4.5 5v6c0 5 3.15 7.9 7.5 9 4.35-1.1 7.5-4 7.5-9V5L12 2Z"/><circle cx="12" cy="10" r="2"/><path d="M9 15.2a3 3 0 0 1 6 0"/>`,
  package: `<path d="M21 8.5 12 3.5 3 8.5v7l9 5 9-5v-7Z"/><path d="M3 8.5l9 5 9-5"/><path d="M12 21v-7.5"/><path d="M16.5 6 7.5 11"/>`,
  palette: `<path d="M12 2a10 10 0 1 0 3.2 19.5 2.3 2.3 0 0 0 1.2-3.7 1.9 1.9 0 0 1 1.4-3.1H19a3 3 0 0 0 3-3c0-5.2-4.5-9.7-10-9.7Z"/><circle cx="7.3" cy="10.8" r="1.15"/><circle cx="10.6" cy="7.2" r="1.15"/><circle cx="15.2" cy="8.4" r="1.15"/><circle cx="16.6" cy="12.8" r="1.15"/>`,
  template: `<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18"/><path d="M9 21V9"/>`,
  shield: `<path d="M12 2 4.5 5v6c0 5 3.15 7.9 7.5 9 4.35-1.1 7.5-4 7.5-9V5L12 2Z"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>`,
  sun: `<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/>`,
  moon: `<path d="M20.5 13.4A8.6 8.6 0 1 1 10.6 3.5a7 7 0 0 0 9.9 9.9Z"/>`,
  user: `<circle cx="12" cy="8" r="4"/><path d="M4 20.5a8 8 0 0 1 16 0"/>`,
  x: `<path d="M18 6 6 18M6 6l12 12"/>`,
  search: `<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>`,
  cornerDownLeft: `<path d="M9 10 4 15l5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>`
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="strokeWidth()" stroke-linecap="round" stroke-linejoin="round" [innerHTML]="svg()"></svg>`,
  styles: [`:host { display: inline-flex; line-height: 0; flex-shrink: 0; }`]
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);
  name = input.required<string>();
  size = input(18);
  strokeWidth = input(2);
  svg = computed(() => this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] || ''));
}
