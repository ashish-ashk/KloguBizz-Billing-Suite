import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonRowsComponent } from '../../shared/ui';
import { IconComponent } from '../../shared/icons';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-super-branding',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonRowsComponent, IconComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Branding &amp; Logo</h1>
        <p>White-label the platform</p>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" [disabled]="saving()" (click)="save()">Save Branding</button>
      </div>
    </div>

    @if (loading()) {
      <div class="card flush"><app-skeleton-rows [count]="5" /></div>
    } @else {
      <div class="grid grid-wide">
        <div style="display:grid;gap:16px;align-content:start;">
          <section class="card">
            <div class="card-title" style="margin-bottom:14px;">Platform Logo</div>
            <div class="grid grid-2">
              <div>
                <div style="font-size:12px;font-weight:600;margin-bottom:4px;">Main Logo</div>
                <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">200×60px PNG/SVG · Used in sidebar, emails, invoices</div>
                <button type="button" (click)="logoInput.click()"
                  style="width:100%;border:2px dashed var(--border);border-radius:10px;padding:22px;text-align:center;background:var(--card);cursor:pointer;">
                  @if (branding.logoUrl) {
                    <img [src]="branding.logoUrl" alt="Logo" style="max-height:40px;max-width:100%;display:block;margin:0 auto 8px;" />
                    <div style="font-size:11px;color:var(--green);font-weight:600;display:flex;align-items:center;justify-content:center;gap:5px;">
                      <app-icon name="checkCircle" [size]="13" /> Uploaded — click to replace
                    </div>
                  } @else {
                    <div style="display:flex;justify-content:center;color:var(--muted);"><app-icon name="upload" [size]="22" /></div>
                    <div style="font-size:12px;color:var(--muted);margin-top:6px;">Click to upload</div>
                  }
                </button>
                <input #logoInput type="file" accept="image/*" hidden (change)="onFile($event, 'logoUrl')" />
              </div>
              <div>
                <div style="font-size:12px;font-weight:600;margin-bottom:4px;">Favicon / App Icon</div>
                <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">512×512px PNG · Browser tab and mobile icon</div>
                <button type="button" (click)="favInput.click()"
                  style="width:100%;border:2px dashed var(--border);border-radius:10px;padding:22px;text-align:center;background:var(--card);cursor:pointer;">
                  @if (branding.faviconUrl) {
                    <img [src]="branding.faviconUrl" alt="Favicon" style="max-height:40px;display:block;margin:0 auto 8px;" />
                    <div style="font-size:11px;color:var(--green);font-weight:600;display:flex;align-items:center;justify-content:center;gap:5px;">
                      <app-icon name="checkCircle" [size]="13" /> Uploaded — click to replace
                    </div>
                  } @else {
                    <div style="display:flex;justify-content:center;color:var(--muted);"><app-icon name="upload" [size]="22" /></div>
                    <div style="font-size:12px;color:var(--muted);margin-top:6px;">Click to upload</div>
                  }
                </button>
                <input #favInput type="file" accept="image/*" hidden (change)="onFile($event, 'faviconUrl')" />
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:14px;">Brand Colors</div>
            <div class="grid grid-3">
              <div class="field">
                <label>Primary Color</label>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="color" [(ngModel)]="branding.primaryColor" style="width:42px;height:42px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--card);cursor:pointer;flex-shrink:0;" />
                  <input class="mono" [(ngModel)]="branding.primaryColor" />
                </div>
              </div>
              <div class="field">
                <label>Secondary Color</label>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="color" [(ngModel)]="branding.secondaryColor" style="width:42px;height:42px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--card);cursor:pointer;flex-shrink:0;" />
                  <input class="mono" [(ngModel)]="branding.secondaryColor" />
                </div>
              </div>
              <div class="field">
                <label>Accent Color</label>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="color" [(ngModel)]="branding.accentColor" style="width:42px;height:42px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--card);cursor:pointer;flex-shrink:0;" />
                  <input class="mono" [(ngModel)]="branding.accentColor" />
                </div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:14px;">Platform Information</div>
            <div class="grid grid-2" style="gap:12px;">
              <div class="field"><label>App Name</label><input [(ngModel)]="branding.appName" /></div>
              <div class="field"><label>Tagline</label><input [(ngModel)]="branding.tagline" /></div>
              <div class="field"><label>Support Email</label><input [(ngModel)]="branding.supportEmail" /></div>
              <div class="field"><label>Website URL</label><input [(ngModel)]="branding.websiteUrl" /></div>
            </div>
          </section>
        </div>

        <section class="card" style="align-self:start;">
          <div class="card-title" style="margin-bottom:14px;">Live Preview</div>
          <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;">
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:14px;">
              @if (branding.logoUrl) {
                <img [src]="branding.logoUrl" alt="Logo" style="height:28px;" />
              } @else {
                <div [style.background]="'linear-gradient(135deg,' + branding.accentColor + ',' + branding.primaryColor + ')'"
                  style="width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px;">
                  {{ (branding.appName || 'K')[0] }}
                </div>
              }
              <div>
                <div style="color:var(--text);font-weight:800;font-size:13px;">{{ branding.appName || 'Klogu Bizz' }}</div>
                <div style="color:var(--muted);font-size:10px;">{{ branding.tagline || 'GST Billing Suite' }}</div>
              </div>
            </div>
            <div [style.background]="hexToTint(branding.primaryColor)"
              style="border-radius:8px;padding:8px 10px;color:var(--brand);font-size:12px;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:7px;">
              <app-icon name="dashboard" [size]="13" /> Dashboard
            </div>
            <div style="padding:8px 10px;color:var(--muted);font-size:12px;display:flex;align-items:center;gap:7px;">
              <app-icon name="invoice" [size]="13" /> Invoices
            </div>
            <div style="padding:8px 10px;color:var(--muted);font-size:12px;display:flex;align-items:center;gap:7px;">
              <app-icon name="creditCard" [size]="13" /> Payments
            </div>
          </div>
          <div style="display:grid;gap:10px;margin-top:16px;">
            <button type="button"
              [style.background]="'linear-gradient(135deg,' + branding.primaryColor + ',' + branding.secondaryColor + ')'"
              style="border:0;border-radius:8px;padding:10px;color:#fff;font-weight:700;font-size:13px;cursor:default;">Primary Button</button>
            <button type="button"
              [style.color]="branding.primaryColor" [style.borderColor]="branding.primaryColor"
              style="background:var(--card);border:1.5px solid;border-radius:8px;padding:10px;font-weight:700;font-size:13px;cursor:default;">Secondary Button</button>
          </div>
        </section>
      </div>
    }
  `
})
export class SuperBrandingComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  branding: any = {
    appName: 'Klogu Bizz', tagline: 'GST Billing Suite',
    primaryColor: '#4F46E5', secondaryColor: '#312E81', accentColor: '#818CF8',
    supportEmail: '', websiteUrl: '', logoUrl: '', faviconUrl: ''
  };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.api.superSettings().subscribe({
      next: s => {
        if (s['branding']) this.branding = { ...this.branding, ...s['branding'] };
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  onFile(event: Event, key: 'logoUrl' | 'faviconUrl') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { this.toast.error('Image must be under 500 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { this.branding[key] = reader.result as string; };
    reader.readAsDataURL(file);
  }

  hexToTint(hex: string): string {
    return `linear-gradient(135deg, ${hex}59, ${hex}33)`;
  }

  save() {
    this.saving.set(true);
    this.api.superSaveSetting('branding', this.branding).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Branding saved'); },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
