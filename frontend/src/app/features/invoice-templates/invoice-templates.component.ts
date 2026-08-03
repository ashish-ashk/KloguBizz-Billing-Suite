import { Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { InvoiceDocumentComponent } from '../../shared/invoice-document.component';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Organisation } from '../../core/models';
import {
  COLOR_PALETTE, CUSTOM_TEMPLATE_ID, CustomInvoiceTemplate, DEFAULT_CUSTOM_INVOICE_TEMPLATE, DIVIDER_STYLE_OPTIONS,
  FONT_OPTIONS, HEADER_STYLE_OPTIONS, INVOICE_TEMPLATES, PAPER_TONE_OPTIONS, TABLE_STYLE_OPTIONS, TEMPLATE_CATEGORIES,
  TemplateCategory, TITLE_ALIGN_OPTIONS
} from '../../core/invoice-templates';
// Shared with the super admin's platform-default page, so both previews show
// identical content — comparing designs only means something when the data
// underneath is the same.
import { SAMPLE_CLIENT, SAMPLE_INVOICE } from '../../core/sample-invoice';

type PickerMode = 'preset' | 'custom';
type CategoryFilter = 'All' | TemplateCategory;

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

    .swatch-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .swatch-btn {
      width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; padding: 0; cursor: pointer;
      box-shadow: 0 0 0 1px var(--border); flex-shrink: 0; transition: transform .12s ease;
    }
    .swatch-btn:hover { transform: scale(1.1); }
    .swatch-btn.selected { border-color: var(--card); box-shadow: 0 0 0 2px var(--fg); }

    .cat-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .cat-chip {
      border: 1px solid var(--border); background: var(--card); color: var(--muted); border-radius: 999px;
      padding: 5px 12px; font-size: 11.5px; font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .cat-chip.active { background: var(--fg); color: var(--card); border-color: var(--fg); }
  `],
  template: `
    <app-shell title="Invoice Templates" subtitle="Choose how your invoices and bills look, and add your company logo">
      <button actions class="btn ghost" type="button" [disabled]="!dirty()" (click)="discard()">Discard Changes</button>
      <button actions class="btn primary" type="button" [disabled]="!dirty() || saving()" (click)="save()">
        @if (saving()) { <span class="spinner"></span> } Save Template
      </button>

      <div class="info-box" style="margin-bottom:20px;display:flex;gap:8px;align-items:flex-start;">
        <app-icon name="template" [size]="14" style="margin-top:1px;flex-shrink:0;" />
        <span>Pick from 15 real, coordinated invoice designs, or build your own from scratch below. Add your logo, pick an accent color
        and toggle what appears on the document. The preview on the right updates instantly — nothing changes for your real invoices until
        you hit <strong>Save Template</strong>.</span>
      </div>

      <div class="it-layout">
        <div style="display:grid;gap:20px;">
          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Company Logo</div>
            <div class="card-sub" style="margin-bottom:12px;">Shown in your sidebar, the top bar, and on every invoice header — visible to everyone in your organisation</div>
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
            <div class="card-title" style="margin-bottom:4px;">Invoice Header Image</div>
            <div class="card-sub" style="margin-bottom:12px;">Optional — upload your own full-width letterhead/banner and it replaces the template's coded header entirely, on screen and in the downloaded PDF</div>
            <button type="button" (click)="headerImageInput.click()"
              style="width:100%;border:2px dashed var(--border);border-radius:10px;padding:20px;text-align:center;background:var(--card);cursor:pointer;">
              @if (headerImageUrl()) {
                <img [src]="headerImageUrl()" alt="Header" style="max-height:60px;max-width:100%;display:block;margin:0 auto 8px;" />
                <div style="font-size:11px;color:var(--green);font-weight:600;display:flex;gap:4px;align-items:center;justify-content:center;">
                  <app-icon name="checkCircle" [size]="13" /> Uploaded — click to replace
                </div>
              } @else {
                <div style="color:var(--muted);display:flex;justify-content:center;"><app-icon name="upload" [size]="22" [strokeWidth]="1.5" /></div>
                <div style="font-size:12px;color:var(--muted);margin-top:6px;">Click to upload a header image</div>
              }
            </button>
            <input #headerImageInput type="file" accept="image/*" hidden (change)="onHeaderImageFile($event)" />
            @if (headerImageUrl()) {
              <button class="btn ghost sm" type="button" style="margin-top:8px;" (click)="removeHeaderImage()">Remove header image</button>
            }
          </section>

          <!--
            Bank details, signature and terms (2.3 #24, #25, #26).

            Three toggles in "Document Content" promised something the data could not
            deliver: showBankDetails rendered an empty block because the details lived only
            on the invoice and had to be retyped every time; showSignature drew a line with
            nothing above it; and there was no default terms text anywhere. Held on the
            organisation because they are properties of the business, not of one document.
          -->
          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Bank Details</div>
            <div class="card-sub" style="margin-bottom:12px;">
              Printed on every invoice with "Show bank details" on. Saved once here instead of
              retyped per invoice — a per-invoice override still wins when set.
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Account name</label><input [(ngModel)]="defaults.accountName" (ngModelChange)="touchDefaults()"></div>
              <div class="field"><label>Bank</label><input [(ngModel)]="defaults.bankName" (ngModelChange)="touchDefaults()"></div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Account number</label><input class="mono" [(ngModel)]="defaults.accountNumber" (ngModelChange)="touchDefaults()"></div>
              <div class="field">
                <label>IFSC</label>
                <input class="mono" [(ngModel)]="defaults.ifsc" (ngModelChange)="touchDefaults()" placeholder="HDFC0001234">
              </div>
            </div>
            <div class="grid grid-2">
              <div class="field"><label>Branch</label><input [(ngModel)]="defaults.branch" (ngModelChange)="touchDefaults()"></div>
              <div class="field">
                <label>UPI ID</label>
                <input class="mono" [(ngModel)]="defaults.upiId" (ngModelChange)="touchDefaults()" placeholder="business@bank">
                <!-- Text, not a QR: a payment code this product cannot verify scans is a
                     payment instruction that might silently not work. -->
                <div class="card-sub" style="margin-top:4px;">Printed as text so it can be typed or copied.</div>
              </div>
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Signature</div>
            <div class="card-sub" style="margin-bottom:12px;">
              Appears above the signature line. Without one, "Show signature" draws a line with
              nothing on it.
            </div>
            <button type="button" (click)="signatureInput.click()"
              style="width:100%;border:2px dashed var(--border);border-radius:10px;padding:16px;text-align:center;background:var(--card);cursor:pointer;">
              @if (signatureUrl()) {
                <img [src]="signatureUrl()" alt="Signature" style="max-height:44px;max-width:100%;display:block;margin:0 auto 8px;" />
                <div style="font-size:11px;color:var(--green);font-weight:600;display:flex;gap:4px;align-items:center;justify-content:center;">
                  <app-icon name="checkCircle" [size]="13" /> Uploaded — click to replace
                </div>
              } @else {
                <div style="color:var(--muted);display:flex;justify-content:center;"><app-icon name="upload" [size]="20" [strokeWidth]="1.5" /></div>
                <div style="font-size:12px;color:var(--muted);margin-top:6px;">Upload a signature image</div>
              }
            </button>
            <input #signatureInput type="file" accept="image/*" hidden (change)="onSignatureFile($event)" />
            @if (signatureUrl()) {
              <button class="btn ghost sm" type="button" style="margin-top:8px;" (click)="removeSignature()">Remove signature</button>
            }
            <div class="field" style="margin-top:12px;">
              <label>Signatory name</label>
              <input [(ngModel)]="defaults.signatoryName" (ngModelChange)="touchDefaults()" [placeholder]="auth.organisation()?.name || ''">
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Default Terms &amp; Notes</div>
            <div class="card-sub" style="margin-bottom:12px;">
              Pre-filled on every new invoice, and still editable per invoice.
            </div>
            <div class="field">
              <label>Terms &amp; conditions</label>
              <textarea rows="3" [(ngModel)]="defaults.termsAndConditions" (ngModelChange)="touchDefaults()"
                placeholder="Payment due within 15 days. Interest at 18% p.a. on overdue amounts."></textarea>
            </div>
            <div class="field">
              <label>Default note</label>
              <input [(ngModel)]="defaults.defaultNotes" (ngModelChange)="touchDefaults()" placeholder="Thank you for your business!">
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Accent Color</div>
            <div class="card-sub" style="margin-bottom:12px;">Pick a curated color, or enter your own hex code</div>
            <div class="accent-row">
              <input type="color" [ngModel]="accentColor()" (ngModelChange)="accentColor.set($event)"
                style="width:42px;height:42px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--card);cursor:pointer;flex-shrink:0;" />
              <input class="mono" [ngModel]="accentColor()" (ngModelChange)="accentColor.set($event)" />
            </div>
            <div class="swatch-row">
              @for (c of colorPalette; track c.value) {
                <button type="button" class="swatch-btn" [class.selected]="accentColor().toLowerCase() === c.value"
                  [style.background]="c.value" [title]="c.name" (click)="accentColor.set(c.value)"></button>
              }
            </div>
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Invoice Title</div>
            <div class="card-sub" style="margin-bottom:12px;">Overrides every template's title word — leave blank to keep each design's own default ("Invoice", "Tax Invoice", etc.)</div>
            <input [ngModel]="invoiceTitleLabel()" (ngModelChange)="invoiceTitleLabel.set($event)"
              placeholder="e.g. Tax Invoice, Proforma Invoice, Bill, Receipt" maxlength="40" />
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
                <div class="card-sub">15 real, coordinated designs — filter by style, or search, then click to preview instantly</div>
              </div>
              @if (mode() === 'preset') { <span class="pill active">✓ Active</span> }
            </div>
            <input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Search templates…" style="margin-bottom:10px;" />
            <div class="cat-chip-row">
              <button type="button" class="cat-chip" [class.active]="categoryFilter() === 'All'" (click)="categoryFilter.set('All')">All ({{ templates.length }})</button>
              @for (cat of categories; track cat) {
                <button type="button" class="cat-chip" [class.active]="categoryFilter() === cat" (click)="categoryFilter.set(cat)">{{ cat }}</button>
              }
            </div>
            <div style="display:grid;gap:10px;">
              @for (t of filteredTemplates(); track t.id) {
                <button type="button" class="theme-card" [class.selected]="mode() === 'preset' && selectedTemplateId() === t.id"
                  (click)="selectPreset(t.id)">
                  @if (savedMode() === 'preset' && savedTemplateId() === t.id) { <span class="theme-current-badge">Current</span> }
                  <span style="width:44px;height:36px;border-radius:6px;flex-shrink:0;display:grid;place-items:center;font-size:9px;font-weight:700;color:#fff;"
                    [style.background]="accentColor()">{{ t.name.slice(0,2).toUpperCase() }}</span>
                  <span class="theme-card-info">
                    <span class="theme-card-name">{{ t.name }} <span class="pill" style="font-size:9.5px;padding:1px 7px;margin-left:4px;">{{ t.category }}</span></span>
                    <span style="font-size:11px;color:var(--muted);">{{ t.description }}</span>
                  </span>
                </button>
              } @empty {
                <div class="card-sub" style="padding:16px 0;text-align:center;">No templates match — try a different search or category.</div>
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
              [showAmountInWords]="content().showAmountInWords"
              [invoiceTitleLabel]="invoiceTitleLabel()"
              [headerImageUrl]="headerImageUrl()"
              [invoiceDefaults]="defaults"
              [signatureSrc]="signatureUrl()" />
          </div>
        </div>
      </div>
    </app-shell>
  `
})
export class InvoiceTemplatesComponent implements OnInit {
  @ViewChild('logoInput') logoInputRef?: ElementRef<HTMLInputElement>;

  templates = INVOICE_TEMPLATES;
  categories = TEMPLATE_CATEGORIES;
  colorPalette = COLOR_PALETTE;
  fontOptions = FONT_OPTIONS;
  headerStyleOptions = HEADER_STYLE_OPTIONS;
  titleAlignOptions = TITLE_ALIGN_OPTIONS;
  tableStyleOptions = TABLE_STYLE_OPTIONS;
  dividerStyleOptions = DIVIDER_STYLE_OPTIONS;
  paperToneOptions = PAPER_TONE_OPTIONS;
  sampleInvoice = SAMPLE_INVOICE;
  sampleClient = SAMPLE_CLIENT;

  logoUrl = signal('');
  headerImageUrl = signal('');

  /**
   * Organisation-level invoice defaults (2.3 #24–#26).
   *
   * A plain object rather than a signal per field: it is bound with `[(ngModel)]`
   * throughout and passed to the preview as a whole, and fifteen signals would buy
   * nothing here. `defaultsDirty` tracks whether it needs saving, the same way the two
   * image fields do.
   */
  defaults: NonNullable<NonNullable<Organisation['brandingConfig']>['invoiceDefaults']> = {};
  defaultsDirty = signal(false);
  /**
   * Whether the user has uploaded or removed the image in this session.
   *
   * `logoUrl` holds an asset URL after a load and image data after an upload, so
   * the save path needs to know which — see `save()`.
   */
  logoDirty = signal(false);
  headerImageDirty = signal(false);
  /**
   * The signature, held apart from `defaults` for the same reason the logo is
   * held apart from `brandingConfig` (#45).
   *
   * The API returns `signatureAssetUrl`, never the bytes — so after a load this
   * holds a *URL*. Sending that back on `signatureUrl` would store a URL as
   * image data, and sending the empty string the response now carries would
   * erase the signature on any unrelated save (changing the bank name, say).
   * `signatureDirty` is what distinguishes "the user changed this" from "this is
   * just what was loaded".
   */
  signatureUrl = signal('');
  signatureDirty = signal(false);
  accentColor = signal('#4f46e5');
  invoiceTitleLabel = signal('');
  mode = signal<PickerMode>('preset');
  selectedTemplateId = signal('modern-minimal');
  customTemplate = signal<CustomInvoiceTemplate>({ ...DEFAULT_CUSTOM_INVOICE_TEMPLATE });
  content = signal<ContentToggles>({ ...DEFAULT_CONTENT });

  categoryFilter = signal<CategoryFilter>('All');
  searchQuery = signal('');

  savedLogoUrl = signal('');
  savedHeaderImageUrl = signal('');
  savedAccentColor = signal('#4f46e5');
  savedInvoiceTitleLabel = signal('');
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

  filteredTemplates = computed(() => {
    const cat = this.categoryFilter();
    const q = this.searchQuery().trim().toLowerCase();
    return this.templates.filter(t =>
      (cat === 'All' || t.category === cat) &&
      (!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    );
  });

  dirty = computed(() =>
    this.defaultsDirty() ||
    this.signatureDirty() ||
    this.logoUrl() !== this.savedLogoUrl() ||
    this.headerImageUrl() !== this.savedHeaderImageUrl() ||
    this.accentColor() !== this.savedAccentColor() ||
    this.invoiceTitleLabel() !== this.savedInvoiceTitleLabel() ||
    this.mode() !== this.savedMode() ||
    (this.mode() === 'preset' ? this.selectedTemplateId() !== this.savedTemplateId() : false) ||
    (this.mode() === 'custom' ? JSON.stringify(this.customTemplate()) !== JSON.stringify(this.savedCustomTemplate()) : false) ||
    JSON.stringify(this.content()) !== JSON.stringify(this.savedContent())
  );

  constructor(public auth: AuthService, private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    const branding = this.auth.organisation()?.brandingConfig || {};
    // The API no longer returns the base64 for these — it returns a cacheable
    // asset URL, which an <img src> renders identically. That is why `logoDirty`
    // exists below: the value held here is a *URL*, so it must never be written
    // back to `logoUrl` as if it were image data.
    const logo = this.api.assetUrl(branding.logoAssetUrl);
    const headerImage = this.api.assetUrl(branding.headerImageAssetUrl);
    const accent = branding.primaryColor || '#4f46e5';
    const titleLabel = branding.invoiceTitleLabel || '';
    const templateId = branding.invoiceTemplateId || 'modern-minimal';
    const isCustom = templateId === CUSTOM_TEMPLATE_ID;
    const custom = { ...DEFAULT_CUSTOM_INVOICE_TEMPLATE, ...(branding.customInvoiceTemplate || {}) };
    const content = { ...DEFAULT_CONTENT, ...(branding.invoiceContent || {}) };

    this.defaults = { ...(branding.invoiceDefaults || {}) };
    this.defaultsDirty.set(false);
    // Same treatment as the logo: what comes back is an asset URL, so it is held
    // separately and only written back when the user actually changes it.
    this.signatureUrl.set(this.api.assetUrl(branding.invoiceDefaults?.signatureAssetUrl));
    this.signatureDirty.set(false);
    this.logoUrl.set(logo); this.savedLogoUrl.set(logo);
    this.headerImageUrl.set(headerImage); this.savedHeaderImageUrl.set(headerImage);
    this.accentColor.set(accent); this.savedAccentColor.set(accent);
    this.invoiceTitleLabel.set(titleLabel); this.savedInvoiceTitleLabel.set(titleLabel);
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
    reader.onload = () => {
      this.logoUrl.set(reader.result as string);
      this.logoDirty.set(true);
    };
    reader.readAsDataURL(file);
  }

  removeLogo() {
    this.logoUrl.set('');
    this.logoDirty.set(true);
  }

  onHeaderImageFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 700 * 1024) { this.toast.error('Header image must be under 700 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      this.headerImageUrl.set(reader.result as string);
      this.headerImageDirty.set(true);
    };
    reader.readAsDataURL(file);
  }

  /** Marks the defaults block as needing a save. */
  touchDefaults() {
    this.defaultsDirty.set(true);
  }

  /**
   * Reads a signature upload as a data URI.
   *
   * Capped at 200KB — a signature is a small monochrome image, and the cap exists
   * because this rides inside the organisation document. An oversized upload is refused
   * with the reason rather than silently truncated.
   */
  onSignatureFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      this.toast.error('That signature is over 200 KB. A signature only needs to be a small image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.signatureUrl.set(reader.result as string);
      this.signatureDirty.set(true);
    };
    reader.readAsDataURL(file);
  }

  removeSignature() {
    // An empty string clears it server-side; `undefined` would leave it untouched.
    // `signatureDirty` is what makes the difference between the two — see the
    // field's declaration.
    this.signatureUrl.set('');
    this.signatureDirty.set(true);
  }

  removeHeaderImage() {
    this.headerImageUrl.set('');
    this.headerImageDirty.set(true);
  }

  discard() {
    this.logoUrl.set(this.savedLogoUrl());
    this.headerImageUrl.set(this.savedHeaderImageUrl());
    this.logoDirty.set(false);
    this.headerImageDirty.set(false);
    // Back to whatever the last response said, which for the signature is the
    // asset URL rather than the bytes.
    const savedDefaults = this.auth.organisation()?.brandingConfig?.invoiceDefaults;
    this.defaults = { ...(savedDefaults || {}) };
    this.defaultsDirty.set(false);
    this.signatureUrl.set(this.api.assetUrl(savedDefaults?.signatureAssetUrl));
    this.signatureDirty.set(false);
    this.accentColor.set(this.savedAccentColor());
    this.invoiceTitleLabel.set(this.savedInvoiceTitleLabel());
    this.mode.set(this.savedMode());
    this.selectedTemplateId.set(this.savedTemplateId());
    this.customTemplate.set({ ...this.savedCustomTemplate() });
    this.content.set({ ...this.savedContent() });
  }

  save() {
    this.saving.set(true);

    /**
     * A partial update. The backend merges `brandingConfig` field by field, so
     * only what is sent is written.
     *
     * The two image keys are included **only when the user actually changed
     * them**, and this is load-bearing rather than an optimisation: `logoUrl()`
     * now holds an asset *URL*, not image data. Sending it unconditionally — as
     * the previous spread of `...current` effectively did — would overwrite the
     * stored base64 with a URL string, so changing the accent colour would
     * destroy the logo.
     */
    const brandingConfig: Record<string, unknown> = {
      primaryColor: this.accentColor(),
      invoiceTitleLabel: this.invoiceTitleLabel(),
      invoiceTemplateId: this.effectiveTemplateId(),
      customInvoiceTemplate: this.customTemplate(),
      invoiceContent: this.content()
    };
    /**
     * `invoiceDefaults` only when touched, and the signature only when *it* was
     * touched — two separate conditions on purpose.
     *
     * `this.defaults` came from a response, so its `signatureUrl` is the empty
     * string the API now sends (the bytes come back as an asset URL instead).
     * Including that on an unrelated save — editing the bank details, say —
     * would clear the signature, which is exactly the bug the logo had before
     * `logoDirty` existed. The field is deleted rather than left empty so the
     * server's dot-path merge leaves the stored image alone.
     */
    if (this.defaultsDirty() || this.signatureDirty()) {
      const invoiceDefaults: Record<string, unknown> = { ...this.defaults };
      delete invoiceDefaults['signatureAssetUrl'];
      delete invoiceDefaults['hasSignature'];
      if (this.signatureDirty()) invoiceDefaults['signatureUrl'] = this.signatureUrl();
      else delete invoiceDefaults['signatureUrl'];
      brandingConfig['invoiceDefaults'] = invoiceDefaults;
    }
    // A data URI sets a new image; an empty string clears it. Either way this is
    // image data, never a URL.
    if (this.logoDirty()) brandingConfig['logoUrl'] = this.logoUrl();
    if (this.headerImageDirty()) brandingConfig['headerImageUrl'] = this.headerImageUrl();

    this.api.updateOrganisation({ brandingConfig } as any).subscribe({
      next: org => {
        this.saving.set(false);
        this.auth.setOrganisation(org);
        // Re-read the images from the response, so the previews switch from the
        // just-uploaded data URI to the cacheable asset URL the server minted.
        const saved = org.brandingConfig || {};
        const logo = this.api.assetUrl(saved.logoAssetUrl);
        const header = this.api.assetUrl(saved.headerImageAssetUrl);
        this.logoUrl.set(logo);
        this.headerImageUrl.set(header);
        this.logoDirty.set(false);
        this.headerImageDirty.set(false);
        this.defaultsDirty.set(false);
        this.defaults = { ...(saved.invoiceDefaults || this.defaults) };
        // Switch the preview from the just-uploaded data URI to the cacheable
        // asset URL the server minted, same as the logo above.
        this.signatureUrl.set(this.api.assetUrl(saved.invoiceDefaults?.signatureAssetUrl));
        this.signatureDirty.set(false);
        this.savedLogoUrl.set(logo);
        this.savedHeaderImageUrl.set(header);
        this.savedAccentColor.set(this.accentColor());
        this.savedInvoiceTitleLabel.set(this.invoiceTitleLabel());
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
