import { Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { InvoiceDocumentComponent, InvoiceDocClient, InvoiceDocData } from '../../shared/invoice-document.component';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import {
  CUSTOM_TEMPLATE_ID, CustomInvoiceTemplate, DEFAULT_CUSTOM_INVOICE_TEMPLATE, DIVIDER_STYLE_OPTIONS,
  FONT_OPTIONS, HEADER_STYLE_OPTIONS, INVOICE_TEMPLATES, PAPER_TONE_OPTIONS, TABLE_STYLE_OPTIONS, TITLE_ALIGN_OPTIONS
} from '../../core/invoice-templates';

type PickerMode = 'preset' | 'custom';

interface ContentToggles {
  showLogo: boolean;
  showSignature: boolean;
  showBankDetails: boolean;
  showAmountInWords: boolean;
  showGstBreakdown: boolean;
}

const DEFAULT_CONTENT: ContentToggles = {
  showLogo: true, showSignature: true, showBankDetails: true, showAmountInWords: true, showGstBreakdown: true
};

const SAMPLE_INVOICE: InvoiceDocData = {
  invoiceNumber: 'KLG-2026-001',
  date: new Date(2026, 6, 1).toISOString(),
  dueDate: new Date(2026, 6, 16).toISOString(),
  items: [
    { desc: 'Web Development Services', hsn: '998314', qty: 1, rate: 45000, gstRate: 18 },
    { desc: 'UI/UX Design', hsn: '998314', qty: 1, rate: 15000, gstRate: 18 }
  ],
  totals: { subtotal: 60000, cgst: 5400, sgst: 5400, igst: 0, total: 70800, isIGST: false },
  notes: 'Thank you for your business!',
  paymentTerms: 'Net 15',
  bankDetails: { bank: 'HDFC Bank', account: '50100123456789', ifsc: 'HDFC0001234' }
};

const SAMPLE_CLIENT: InvoiceDocClient = {
  companyName: 'Acme Traders Pvt Ltd', address: 'BKC, Mumbai, Maharashtra 400051', gstin: '27AAAAA0000A1Z5', stateCode: '27'
};

@Component({
  selector: 'app-invoice-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, InvoiceDocumentComponent, IconComponent],
  styles: [`
    .it-layout { display: grid; grid-template-columns: minmax(320px, 380px) 1fr; gap: 24px; align-items: start; }
    @media (max-width: 880px) { .it-layout { grid-template-columns: 1fr; } }

    .accent-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .accent-row input.mono { min-width: 0; flex: 1; }
    .checkbox.wrap-hint { flex-wrap: wrap; }
    @media (max-width: 360px) {
      .accent-row input[type="color"] { width: 100%; height: 36px; }
    }
  `],
  template: `
    <app-shell title="Invoice Templates" subtitle="Choose how your invoices and bills look, and add your company logo">
      <button actions class="btn ghost" type="button" [disabled]="!dirty()" (click)="discard()">Discard Changes</button>
      <button actions class="btn primary" type="button" [disabled]="!dirty() || saving()" (click)="save()">
        @if (saving()) { <span class="spinner"></span> } Save Template
      </button>

      <div class="info-box" style="margin-bottom:20px;display:flex;gap:8px;align-items:flex-start;">
        <app-icon name="template" [size]="14" style="margin-top:1px;flex-shrink:0;" />
        <span>Pick from 8 real, coordinated invoice designs, or build your own from scratch below. Add your logo and toggle what appears
        on the document. The preview on the right updates instantly — nothing changes for your real invoices until
        you hit <strong>Save Template</strong>.</span>
      </div>

      <div class="it-layout">
        <div style="display:grid;gap:20px;">
          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Company Logo</div>
            <div class="card-sub" style="margin-bottom:12px;">Shown in your sidebar and on every invoice header</div>
            <button type="button" (click)="logoInput.click()"
              style="width:100%;border:2px dashed var(--border);border-radius:10px;padding:20px;text-align:center;background:var(--card);cursor:pointer;">
              @if (logoUrl()) {
                <img [src]="logoUrl()" alt="Logo" style="max-height:40px;max-width:100%;display:block;margin:0 auto 8px;" />
                <div style="font-size:11px;color:var(--green);font-weight:600;display:flex;gap:4px;align-items:center;justify-content:center;">
                  <app-icon name="checkCircle" [size]="13" /> Uploaded — click to replace
                </div>
              } @else {
                <div style="color:var(--muted);display:flex;justify-content:center;"><app-icon name="upload" [size]="22" [strokeWidth]="1.5" /></div>
                <div style="font-size:12px;color:var(--muted);margin-top:6px;">Click to upload your logo</div>
              }
            </button>
            <input #logoInput type="file" accept="image/*" hidden (change)="onLogoFile($event)" />
            @if (logoUrl()) {
              <button class="btn ghost sm" type="button" style="margin-top:8px;" (click)="removeLogo()">Remove logo</button>
            }
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:12px;">Accent Color</div>
            <div class="accent-row">
              <input type="color" [ngModel]="accentColor()" (ngModelChange)="accentColor.set($event)"
                style="width:42px;height:42px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--card);cursor:pointer;flex-shrink:0;" />
              <input class="mono" [ngModel]="accentColor()" (ngModelChange)="accentColor.set($event)" />
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:12px;">Invoice Content</div>
            <div style="display:grid;gap:10px;">
              <label class="checkbox" style="justify-content:space-between;">
                <span>Company logo</span>
                <span class="switch"><input type="checkbox" [ngModel]="content().showLogo" (ngModelChange)="setContent('showLogo', $event)" /><span class="track"></span></span>
              </label>
              <label class="checkbox" style="justify-content:space-between;">
                <span>Authorised signature</span>
                <span class="switch"><input type="checkbox" [ngModel]="content().showSignature" (ngModelChange)="setContent('showSignature', $event)" /><span class="track"></span></span>
              </label>
              <label class="checkbox" style="justify-content:space-between;">
                <span>Bank details section</span>
                <span class="switch"><input type="checkbox" [ngModel]="content().showBankDetails" (ngModelChange)="setContent('showBankDetails', $event)" /><span class="track"></span></span>
              </label>
              <label class="checkbox" style="justify-content:space-between;">
                <span>Amount in words</span>
                <span class="switch"><input type="checkbox" [ngModel]="content().showAmountInWords" (ngModelChange)="setContent('showAmountInWords', $event)" /><span class="track"></span></span>
              </label>
              <label class="checkbox" style="justify-content:space-between;">
                <span>GST rate breakdown</span>
                <span class="switch"><input type="checkbox" [ngModel]="content().showGstBreakdown" (ngModelChange)="setContent('showGstBreakdown', $event)" /><span class="track"></span></span>
              </label>
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Choose a Template</div>
                <div class="card-sub">8 real, coordinated designs — click to preview instantly</div>
              </div>
              @if (mode() === 'preset') { <span class="pill active">✓ Active</span> }
            </div>
            <div style="display:grid;gap:10px;">
              @for (t of templates; track t.id) {
                <button type="button" class="theme-card" [class.selected]="mode() === 'preset' && selectedTemplateId() === t.id"
                  (click)="selectPreset(t.id)">
                  @if (savedMode() === 'preset' && savedTemplateId() === t.id) { <span class="theme-current-badge">Current</span> }
                  <span style="width:44px;height:36px;border-radius:6px;flex-shrink:0;display:grid;place-items:center;font-size:9px;font-weight:700;color:#fff;"
                    [style.background]="accentColor()">{{ t.name.slice(0,2).toUpperCase() }}</span>
                  <span class="theme-card-info">
                    <span class="theme-card-name">{{ t.name }}</span>
                    <span style="font-size:11px;color:var(--muted);">{{ t.description }}</span>
                  </span>
                </button>
              }
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Custom Template</div>
                <div class="card-sub">Build your own layout — editing any field switches the preview to your custom build</div>
              </div>
              @if (mode() === 'custom') { <span class="pill active">✓ Active</span> }
              @if (savedMode() === 'custom') { <span class="theme-current-badge" style="position:static;">Current</span> }
            </div>
            <div class="form">
              <div class="field">
                <label>Font</label>
                <select [ngModel]="customTemplate().font" (ngModelChange)="setCustom('font', $event)">
                  @for (f of fontOptions; track f.value) { <option [value]="f.value">{{ f.label }}</option> }
                </select>
              </div>
              <div class="grid grid-2">
                <div class="field">
                  <label>Header Style</label>
                  <select [ngModel]="customTemplate().headerStyle" (ngModelChange)="setCustom('headerStyle', $event)">
                    @for (h of headerStyleOptions; track h.value) { <option [value]="h.value">{{ h.label }}</option> }
                  </select>
                </div>
                <div class="field">
                  <label>Title Alignment</label>
                  <select [ngModel]="customTemplate().titleAlign" (ngModelChange)="setCustom('titleAlign', $event)">
                    @for (a of titleAlignOptions; track a.value) { <option [value]="a.value">{{ a.label }}</option> }
                  </select>
                </div>
              </div>
              <div class="grid grid-2">
                <div class="field">
                  <label>Table Style</label>
                  <select [ngModel]="customTemplate().tableStyle" (ngModelChange)="setCustom('tableStyle', $event)">
                    @for (t of tableStyleOptions; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                  </select>
                </div>
                <div class="field">
                  <label>Divider Style</label>
                  <select [ngModel]="customTemplate().dividerStyle" (ngModelChange)="setCustom('dividerStyle', $event)">
                    @for (d of dividerStyleOptions; track d.value) { <option [value]="d.value">{{ d.label }}</option> }
                  </select>
                </div>
              </div>
              <div class="field">
                <label>Paper Tone</label>
                <select [ngModel]="customTemplate().paperTone" (ngModelChange)="setCustom('paperTone', $event)">
                  @for (p of paperToneOptions; track p.value) { <option [value]="p.value">{{ p.label }}</option> }
                </select>
              </div>
              <label class="checkbox wrap-hint" style="justify-content:space-between;">
                <span>Compact rows <span class="hint" style="text-transform:none;">— tighter spacing for invoices with many line items</span></span>
                <span class="switch"><input type="checkbox" [ngModel]="customTemplate().compact" (ngModelChange)="setCustom('compact', $event)" /><span class="track"></span></span>
              </label>
              <label class="checkbox wrap-hint" style="justify-content:space-between;">
                <span>Narrow margins <span class="hint" style="text-transform:none;">— receipt-style content width</span></span>
                <span class="switch"><input type="checkbox" [ngModel]="customTemplate().narrow" (ngModelChange)="setCustom('narrow', $event)" /><span class="track"></span></span>
              </label>
            </div>
          </section>
        </div>

        <div class="sticky-preview-col" style="position:sticky;top:20px;">
          <div class="card-sub" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
            <span>Live Preview — sample invoice</span>
            <span class="pill">{{ mode() === 'custom' ? 'Custom Template' : selectedTemplateName() }}</span>
          </div>
          <div class="invoice-doc-wrap" style="border:1px solid var(--border);border-radius:14px;overflow-x:auto;overflow-y:hidden;box-shadow:var(--shadow-md);">
            <app-invoice-document
              [invoice]="sampleInvoice"
              [client]="sampleClient"
              [orgName]="auth.organisation()?.name || 'Your Business'"
              [orgAddress]="auth.organisation()?.address || ''"
              [orgGstin]="auth.organisation()?.gstin || ''"
              [orgPan]="auth.organisation()?.pan || ''"
              [templateId]="effectiveTemplateId()"
              [customTemplate]="customTemplate()"
              [accentColor]="accentColor()"
              [logoUrl]="content().showLogo ? logoUrl() : ''"
              [showLogo]="content().showLogo"
              [showSignature]="content().showSignature"
              [showBankDetails]="content().showBankDetails"
              [showAmountInWords]="content().showAmountInWords" />
          </div>
        </div>
      </div>
    </app-shell>
  `
})
export class InvoiceTemplatesComponent implements OnInit {
  @ViewChild('logoInput') logoInputRef?: ElementRef<HTMLInputElement>;

  templates = INVOICE_TEMPLATES;
  fontOptions = FONT_OPTIONS;
  headerStyleOptions = HEADER_STYLE_OPTIONS;
  titleAlignOptions = TITLE_ALIGN_OPTIONS;
  tableStyleOptions = TABLE_STYLE_OPTIONS;
  dividerStyleOptions = DIVIDER_STYLE_OPTIONS;
  paperToneOptions = PAPER_TONE_OPTIONS;
  sampleInvoice = SAMPLE_INVOICE;
  sampleClient = SAMPLE_CLIENT;

  logoUrl = signal('');
  accentColor = signal('#4f46e5');
  mode = signal<PickerMode>('preset');
  selectedTemplateId = signal('modern-minimal');
  customTemplate = signal<CustomInvoiceTemplate>({ ...DEFAULT_CUSTOM_INVOICE_TEMPLATE });
  content = signal<ContentToggles>({ ...DEFAULT_CONTENT });

  savedLogoUrl = signal('');
  savedAccentColor = signal('#4f46e5');
  savedMode = signal<PickerMode>('preset');
  savedTemplateId = signal('modern-minimal');
  savedCustomTemplate = signal<CustomInvoiceTemplate>({ ...DEFAULT_CUSTOM_INVOICE_TEMPLATE });
  savedContent = signal<ContentToggles>({ ...DEFAULT_CONTENT });

  saving = signal(false);

  /** The template id actually sent to the preview/backend: the real catalog
   *  id when browsing presets, or the reserved 'custom' id when editing a
   *  custom build (its details travel separately in `customTemplate`). */
  effectiveTemplateId = computed(() => (this.mode() === 'custom' ? CUSTOM_TEMPLATE_ID : this.selectedTemplateId()));

  selectedTemplateName = computed(() => this.templates.find(t => t.id === this.selectedTemplateId())?.name || 'Template');

  dirty = computed(() =>
    this.logoUrl() !== this.savedLogoUrl() ||
    this.accentColor() !== this.savedAccentColor() ||
    this.mode() !== this.savedMode() ||
    (this.mode() === 'preset' ? this.selectedTemplateId() !== this.savedTemplateId() : false) ||
    (this.mode() === 'custom' ? JSON.stringify(this.customTemplate()) !== JSON.stringify(this.savedCustomTemplate()) : false) ||
    JSON.stringify(this.content()) !== JSON.stringify(this.savedContent())
  );

  constructor(public auth: AuthService, private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    const branding = this.auth.organisation()?.brandingConfig || {};
    const logo = branding.logoUrl || '';
    const accent = branding.primaryColor || '#4f46e5';
    const templateId = branding.invoiceTemplateId || 'modern-minimal';
    const isCustom = templateId === CUSTOM_TEMPLATE_ID;
    const custom = { ...DEFAULT_CUSTOM_INVOICE_TEMPLATE, ...(branding.customInvoiceTemplate || {}) };
    const content = { ...DEFAULT_CONTENT, ...(branding.invoiceContent || {}) };

    this.logoUrl.set(logo); this.savedLogoUrl.set(logo);
    this.accentColor.set(accent); this.savedAccentColor.set(accent);
    this.mode.set(isCustom ? 'custom' : 'preset'); this.savedMode.set(isCustom ? 'custom' : 'preset');
    this.selectedTemplateId.set(isCustom ? 'modern-minimal' : templateId);
    this.savedTemplateId.set(isCustom ? 'modern-minimal' : templateId);
    this.customTemplate.set(custom); this.savedCustomTemplate.set(custom);
    this.content.set(content); this.savedContent.set(content);
  }

  selectPreset(id: string) {
    this.mode.set('preset');
    this.selectedTemplateId.set(id);
  }

  setCustom<K extends keyof CustomInvoiceTemplate>(key: K, value: CustomInvoiceTemplate[K]) {
    this.mode.set('custom');
    this.customTemplate.update(c => ({ ...c, [key]: value }));
  }

  setContent<K extends keyof ContentToggles>(key: K, value: ContentToggles[K]) {
    this.content.update(c => ({ ...c, [key]: value }));
  }

  onLogoFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { this.toast.error('Logo image must be under 500 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => this.logoUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeLogo() {
    this.logoUrl.set('');
  }

  discard() {
    this.logoUrl.set(this.savedLogoUrl());
    this.accentColor.set(this.savedAccentColor());
    this.mode.set(this.savedMode());
    this.selectedTemplateId.set(this.savedTemplateId());
    this.customTemplate.set({ ...this.savedCustomTemplate() });
    this.content.set({ ...this.savedContent() });
  }

  save() {
    const current = this.auth.organisation()?.brandingConfig || {};
    this.saving.set(true);
    this.api.updateOrganisation({
      brandingConfig: {
        ...current,
        logoUrl: this.logoUrl(),
        primaryColor: this.accentColor(),
        invoiceTemplateId: this.effectiveTemplateId(),
        customInvoiceTemplate: this.customTemplate(),
        invoiceContent: this.content()
      }
    }).subscribe({
      next: org => {
        this.saving.set(false);
        this.auth.setOrganisation(org);
        this.savedLogoUrl.set(this.logoUrl());
        this.savedAccentColor.set(this.accentColor());
        this.savedMode.set(this.mode());
        this.savedTemplateId.set(this.selectedTemplateId());
        this.savedCustomTemplate.set({ ...this.customTemplate() });
        this.savedContent.set({ ...this.content() });
        this.toast.success('Invoice template saved');
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
