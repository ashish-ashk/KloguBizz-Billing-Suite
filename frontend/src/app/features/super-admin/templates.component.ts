import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { InvoiceTemplate } from '../../core/models';

interface TemplateConfig {
  paperSize: string; fontSize: string; watermark: string; accentColor: string;
  showLogo: boolean; showSignature: boolean; showBankDetails: boolean;
  showAmountInWords: boolean; showGstBreakdown: boolean; showQrCode: boolean;
}

@Component({
  selector: 'app-super-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonRowsComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Invoice Templates</h1>
        <p>Control how invoices look across the platform</p>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" [disabled]="saving()" (click)="saveConfig()">Save Template Settings</button>
      </div>
    </div>

    @if (loading()) {
      <div class="card flush"><app-skeleton-rows [count]="5" /></div>
    } @else {
      <div class="grid grid-wide">
        <div style="display:grid;gap:16px;align-content:start;">
          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Select Template</div>
            <div class="card-sub" style="margin-bottom:16px;">The default template applies to every new invoice</div>
            <div class="grid grid-2">
              @for (t of templates(); track t._id) {
                <button type="button" (click)="selected.set(t._id)"
                  [style.border]="selected() === t._id ? '2px solid var(--brand)' : '2px solid var(--border)'"
                  style="border-radius:12px;padding:0;overflow:hidden;background:var(--card);cursor:pointer;text-align:left;transition:all .15s;">
                  <div [style.background]="'linear-gradient(135deg,' + t.accentColor + ',var(--sidebar-from))'"
                    style="height:90px;padding:12px;display:flex;flex-direction:column;gap:6px;">
                    <div style="color:#fff;font-size:10px;font-weight:800;letter-spacing:1px;">TAX INVOICE</div>
                    <div style="height:5px;width:70%;background:rgba(255,255,255,.5);border-radius:3px;"></div>
                    <div style="height:5px;width:50%;background:rgba(255,255,255,.35);border-radius:3px;"></div>
                    <div style="height:5px;width:60%;background:rgba(255,255,255,.25);border-radius:3px;"></div>
                  </div>
                  <div style="padding:10px 12px;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                      <div style="font-weight:700;font-size:13px;">{{ t.name }}</div>
                      <div style="font-size:11px;color:var(--muted);">{{ t.layout }} layout</div>
                    </div>
                    @if (t.isDefault) { <span class="pill">Default</span> }
                  </div>
                </button>
              }
            </div>
            <div style="margin-top:14px;">
              <button class="btn secondary sm" type="button" [disabled]="!selected() || saving()" (click)="setDefault()">Set as Default</button>
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:14px;">Invoice Content Settings</div>
            <div class="grid grid-2" style="gap:12px;">
              @for (opt of contentOptions; track opt.key) {
                <label class="checkbox" style="justify-content:space-between;border:1px solid var(--border);border-radius:9px;padding:10px 14px;">
                  <span>{{ opt.label }}</span>
                  <span class="switch"><input type="checkbox" [(ngModel)]="config[opt.key]" /><span class="track"></span></span>
                </label>
              }
            </div>
          </section>
        </div>

        <div style="display:grid;gap:16px;align-content:start;">
          <section class="card">
            <div class="card-title" style="margin-bottom:14px;">Format Settings</div>
            <div class="form">
              <div class="field">
                <label>Paper Size</label>
                <select [(ngModel)]="config.paperSize"><option>A4</option><option>Letter</option><option>Legal</option></select>
              </div>
              <div class="field">
                <label>Font Size</label>
                <select [(ngModel)]="config.fontSize"><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select>
              </div>
              <div class="field">
                <label>Draft Watermark Text</label>
                <input [(ngModel)]="config.watermark" placeholder="DRAFT" />
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:14px;">Accent Color</div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
              <input type="color" [(ngModel)]="config.accentColor" style="width:44px;height:44px;border:1px solid var(--border);border-radius:8px;padding:2px;cursor:pointer;background:var(--card);" />
              <div>
                <div class="mono" style="font-weight:700;font-size:13px;">{{ config.accentColor }}</div>
                <div style="font-size:11px;color:var(--muted);">Custom brand color</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              @for (c of presets; track c) {
                <button type="button" (click)="config.accentColor = c"
                  [style.background]="c"
                  [style.outline]="config.accentColor === c ? '2px solid var(--text)' : 'none'"
                  style="width:28px;height:28px;border-radius:7px;border:2px solid var(--card);box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:pointer;"></button>
              }
            </div>
          </section>

          <div class="info-box">
            These template settings apply globally across all organizations. Individual organizations
            can override the accent color from their own branding settings.
          </div>
        </div>
      </div>
    }
  `
})
export class SuperTemplatesComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  templates = signal<InvoiceTemplate[]>([]);
  selected = signal<string>('');
  readonly presets = ['#4F46E5', '#0F172A', '#059669', '#D97706', '#DC2626', '#7C3AED', '#2563EB', '#0891B2'];
  readonly contentOptions: Array<{ key: keyof TemplateConfig & string; label: string }> = [
    { key: 'showLogo', label: 'Show Company Logo' },
    { key: 'showSignature', label: 'Authorised Signature' },
    { key: 'showBankDetails', label: 'Bank Details Section' },
    { key: 'showAmountInWords', label: 'Amount in Words' },
    { key: 'showGstBreakdown', label: 'GST Rate Breakdown' },
    { key: 'showQrCode', label: 'QR Code for Payment' }
  ];

  config: any = {
    paperSize: 'A4', fontSize: 'medium', watermark: 'DRAFT', accentColor: '#4F46E5',
    showLogo: true, showSignature: true, showBankDetails: true,
    showAmountInWords: true, showGstBreakdown: true, showQrCode: false
  };

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.api.superMasters().subscribe({
      next: res => {
        this.templates.set(res.templates);
        const def = res.templates.find(t => t.isDefault) || res.templates[0];
        if (def) this.selected.set(def._id);
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
    this.api.superSettings().subscribe({
      next: settings => { if (settings['templateConfig']) this.config = { ...this.config, ...settings['templateConfig'] }; }
    });
  }

  setDefault() {
    const id = this.selected();
    if (!id) return;
    this.saving.set(true);
    this.api.superUpdateTemplate(id, { isDefault: true }).subscribe({
      next: t => {
        this.saving.set(false);
        this.templates.update(list => list.map(x => ({ ...x, isDefault: x._id === t._id })));
        this.toast.success(`${t.name} is now the default template`);
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  saveConfig() {
    this.saving.set(true);
    this.api.superSaveSetting('templateConfig', this.config).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Template settings saved'); },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
