import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ToastsComponent } from '../../shared/ui';
import { InvoiceDocumentComponent } from '../../shared/invoice-document.component';
import { Client, Invoice } from '../../core/models';
import { downloadBlob } from '../../core/format';

@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule, RouterLink, ToastsComponent, InvoiceDocumentComponent],
  template: `
    <div style="min-height:100vh;background:var(--bg);padding:28px 20px;">
      <div class="no-print" style="max-width:860px;margin:0 auto 18px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <a class="btn secondary" [routerLink]="['/invoices', invoiceId, 'edit']">← Back to editor</a>
        <div style="display:flex;gap:10px;">
          <button class="btn secondary" type="button" (click)="print()">🖨 Print</button>
          <button class="btn primary" type="button" [disabled]="downloading()" (click)="downloadPdf()">
            @if (downloading()) { <span class="spinner"></span> } ⬇ Download PDF
          </button>
        </div>
      </div>

      @if (invoice(); as inv) {
        <div id="print-area">
          <app-invoice-document
            [invoice]="inv"
            [client]="client()"
            [orgName]="org()?.name || 'Your Business'"
            [orgAddress]="org()?.address || ''"
            [orgGstin]="org()?.gstin || ''"
            [orgPan]="org()?.pan || ''"
            [templateId]="org()?.brandingConfig?.invoiceTemplateId || 'classic-corporate'"
            [customTemplate]="org()?.brandingConfig?.customInvoiceTemplate || null"
            [accentColor]="org()?.brandingConfig?.primaryColor || '#4f46e5'"
            [logoUrl]="org()?.brandingConfig?.logoUrl || ''"
            [showLogo]="org()?.brandingConfig?.invoiceContent?.showLogo !== false"
            [showSignature]="org()?.brandingConfig?.invoiceContent?.showSignature !== false"
            [showBankDetails]="org()?.brandingConfig?.invoiceContent?.showBankDetails !== false"
            [showAmountInWords]="org()?.brandingConfig?.invoiceContent?.showAmountInWords !== false" />
        </div>
      } @else if (!loading()) {
        <div class="card" style="max-width:520px;margin:60px auto;text-align:center;">
          <p style="color:var(--muted);">Invoice not found.</p>
          <a class="btn primary" routerLink="/invoices">Back to invoices</a>
        </div>
      }
    </div>
    <app-toasts />
  `
})
export class InvoicePrintComponent implements OnInit {
  invoiceId = '';
  invoice = signal<Invoice | null>(null);
  loading = signal(true);
  downloading = signal(false);

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) {}

  org() { return this.auth.organisation(); }

  client(): Client | null {
    const inv = this.invoice();
    if (!inv || typeof inv.clientId === 'string') return null;
    return inv.clientId;
  }

  ngOnInit() {
    this.invoiceId = this.route.snapshot.paramMap.get('id') || '';
    this.api.invoice(this.invoiceId).subscribe({
      next: inv => { this.invoice.set(inv); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err, 'Invoice not found.'); }
    });
  }

  print() { window.print(); }

  downloadPdf() {
    this.downloading.set(true);
    this.api.downloadInvoicePdf(this.invoiceId).subscribe({
      next: blob => {
        this.downloading.set(false);
        downloadBlob(blob, `${this.invoice()?.invoiceNumber || 'invoice'}.pdf`);
      },
      error: err => { this.downloading.set(false); this.toast.httpError(err, 'Could not generate the PDF.'); }
    });
  }
}
