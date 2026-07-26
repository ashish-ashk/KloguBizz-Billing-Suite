import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkeletonRowsComponent } from '../../shared/ui';
import { IconComponent } from '../../shared/icons';
import { InvoiceDocumentComponent } from '../../shared/invoice-document.component';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { COLOR_PALETTE, INVOICE_TEMPLATES, TEMPLATE_CATEGORIES, TemplateCategory } from '../../core/invoice-templates';
import { SAMPLE_CLIENT, SAMPLE_INVOICE } from '../../core/sample-invoice';

/**
 * Platform-wide invoice template default.
 *
 * This page used to be backed by a separate `InvoiceTemplate` collection with
 * its own `layout`/`accentColor` fields — an entirely different system from the
 * 22 real templates tenants actually render. Nothing chosen here reached a single
 * invoice: two unrelated concepts shared one name, and the platform owner's
 * "default" was decorative.
 *
 * It now sets the genuine default, stored as the `defaultInvoiceTemplate` global
 * setting and applied by the backend (see platformSettingsService) whenever a
 * tenant has not chosen a template of their own. The gallery is the real
 * registry, previewed with the same renderer that draws the finished document.
 */
@Component({
  selector: 'app-super-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonRowsComponent, IconComponent, InvoiceDocumentComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Invoice Templates</h1>
        <p>Set the default invoice design new organisations start with</p>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" [disabled]="saving() || !dirty()" (click)="save()">
          @if (saving()) { <span class="spinner"></span> }
          Save Platform Default
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="card flush"><app-skeleton-rows [count]="5" /></div>
    } @else {
      <div class="info-box" style="margin-bottom:18px;display:flex;gap:10px;align-items:flex-start;">
        <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
        <span style="line-height:1.6;">
          This is the fallback for organisations that have never picked a template on their own
          <strong>Invoice Templates</strong> page. Tenants who have chosen one keep their choice —
          changing this does not overwrite it.
        </span>
      </div>

      <div class="grid grid-wide" style="gap:20px;align-items:start;">
        <div style="display:grid;gap:16px;align-content:start;">
          <section class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Default Template</div>
                <div class="card-sub">{{ filtered().length }} of {{ templates.length }} designs</div>
              </div>
            </div>

            <div class="toolbar" style="margin-bottom:14px;">
              <div class="search-box">
                <span class="search-icon">⌕</span>
                <input class="input" type="search" placeholder="Search templates…"
                  [ngModel]="query()" (ngModelChange)="query.set($event)" />
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
              <button type="button" class="chip" [class.active]="category() === null" (click)="category.set(null)">All</button>
              @for (c of categories; track c) {
                <button type="button" class="chip" [class.active]="category() === c" (click)="category.set(c)">{{ c }}</button>
              }
            </div>

            @if (filtered().length === 0) {
              <p class="muted" style="font-size:13px;">No templates match that search.</p>
            } @else {
              <div class="grid grid-2" style="gap:12px;">
                @for (t of filtered(); track t.id) {
                  <button type="button" (click)="templateId.set(t.id)"
                    [style.borderColor]="templateId() === t.id ? 'var(--brand)' : 'var(--border)'"
                    [style.background]="templateId() === t.id ? 'var(--brand-pale)' : 'var(--card)'"
                    style="border:2px solid;border-radius:12px;padding:12px 14px;cursor:pointer;text-align:left;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                      <div style="font-weight:700;font-size:13px;">{{ t.name }}</div>
                      @if (templateId() === t.id) { <app-icon name="check" [size]="14" /> }
                    </div>
                    <div class="card-sub" style="margin-top:3px;">{{ t.description }}</div>
                    <span class="pill" style="margin-top:8px;font-size:9.5px;">{{ t.category }}</span>
                  </button>
                }
              </div>
            }
          </section>

          <section class="card">
            <div class="card-title" style="margin-bottom:4px;">Default Accent Colour</div>
            <div class="card-sub" style="margin-bottom:14px;">Used by the template's headings and totals</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
              @for (c of palette; track c.value) {
                <button type="button" [title]="c.name" (click)="accentColor.set(c.value)"
                  [style.background]="c.value"
                  [style.boxShadow]="accentColor().toLowerCase() === c.value.toLowerCase() ? '0 0 0 3px var(--brand-pale), 0 0 0 4px var(--brand)' : 'none'"
                  style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(0,0,0,.12);cursor:pointer;"></button>
              }
            </div>
            <div class="field">
              <label>Custom hex</label>
              <div style="display:flex;gap:10px;align-items:center;">
                <input type="color" [ngModel]="accentColor()" (ngModelChange)="accentColor.set($event)"
                  style="width:48px;height:38px;padding:2px;cursor:pointer;" />
                <input class="input mono" [ngModel]="accentColor()" (ngModelChange)="accentColor.set($event)"
                  placeholder="#4f46e5" style="max-width:140px;" />
              </div>
            </div>
          </section>
        </div>

        <!-- Live preview using the same renderer that draws the real document,
             so what is picked here is exactly what tenants get. -->
        <section class="card sticky-preview-col" style="position:sticky;top:20px;">
          <div class="card-head">
            <div>
              <div class="card-title">Preview</div>
              <div class="card-sub">{{ selectedTemplate().name }} · sample data</div>
            </div>
          </div>
          <div class="invoice-doc-wrap">
            <app-invoice-document
              [invoice]="sampleInvoice"
              [client]="sampleClient"
              orgName="Techsoft Solutions Pvt Ltd"
              orgAddress="14 MG Road, Pune, Maharashtra 411001"
              orgGstin="27AAPFU0939F1ZV"
              [templateId]="templateId()"
              [accentColor]="accentColor()" />
          </div>
        </section>
      </div>
    }
  `
})
export class SuperTemplatesComponent implements OnInit {
  readonly templates = INVOICE_TEMPLATES;
  readonly categories = TEMPLATE_CATEGORIES;
  readonly palette = COLOR_PALETTE;
  readonly sampleInvoice = SAMPLE_INVOICE;
  readonly sampleClient = SAMPLE_CLIENT;

  loading = signal(true);
  saving = signal(false);

  templateId = signal('modern-minimal');
  accentColor = signal('#4f46e5');
  query = signal('');
  category = signal<TemplateCategory | null>(null);

  // What is currently persisted, so Save can be disabled when nothing changed.
  private savedTemplateId = signal('modern-minimal');
  private savedAccentColor = signal('#4f46e5');

  dirty = computed(() =>
    this.templateId() !== this.savedTemplateId() || this.accentColor() !== this.savedAccentColor()
  );

  selectedTemplate = computed(() =>
    this.templates.find(t => t.id === this.templateId()) || this.templates[0]
  );

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.category();
    return this.templates.filter(t => {
      const catOk = !cat || t.category === cat;
      const text = `${t.name} ${t.description} ${t.category}`.toLowerCase();
      return catOk && (!q || text.includes(q));
    });
  });

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.api.superSettings().subscribe({
      next: settings => {
        const saved = settings?.['defaultInvoiceTemplate'] || {};
        if (saved.templateId) {
          this.templateId.set(saved.templateId);
          this.savedTemplateId.set(saved.templateId);
        }
        if (saved.accentColor) {
          this.accentColor.set(saved.accentColor);
          this.savedAccentColor.set(saved.accentColor);
        }
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err, 'Could not load platform settings.'); }
    });
  }

  save() {
    if (this.saving() || !this.dirty()) return;
    this.saving.set(true);
    const payload = { templateId: this.templateId(), accentColor: this.accentColor() };
    this.api.superSaveSetting('defaultInvoiceTemplate', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.savedTemplateId.set(payload.templateId);
        this.savedAccentColor.set(payload.accentColor);
        this.toast.success(`${this.selectedTemplate().name} is now the platform default`);
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
