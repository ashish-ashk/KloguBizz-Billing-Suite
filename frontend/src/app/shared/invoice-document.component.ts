import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceItem, InvoiceTotals } from '../core/models';
import { fmtINR, fmtDate, numberToWords, stateName } from '../core/format';
import { CustomInvoiceTemplate, FONT_STACKS, PAPER_TONE_COLORS, resolveInvoiceTemplate } from '../core/invoice-templates';

export interface InvoiceDocData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  /** Invoice-level discount, needed to price each line for display. */
  discountPercent?: number;
  totals: InvoiceTotals;
  /** Settlement, so a part-paid invoice can show what is still owed. */
  amountPaid?: number;
  balanceDue?: number;
  notes?: string;
  paymentTerms?: string;
  bankDetails?: { bank?: string; account?: string; ifsc?: string };
}

export interface InvoiceDocClient {
  companyName: string;
  address?: string;
  gstin?: string;
  stateCode: string;
}

/**
 * Renders one invoice/bill as an on-screen document, in any built-in
 * template or a tenant's custom build. Shared by the print/download page
 * and the tenant template picker's live preview so both always show
 * exactly the same look.
 *
 * All template-affecting values are signal `input()`s (not `@Input()`)
 * specifically so the internal `computed()`s below re-run when the parent
 * passes new values — `computed()` only tracks signal reads, so plain
 * `@Input()` fields would silently freeze after the first render.
 */
@Component({
  selector: 'app-invoice-document',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invoice-doc" [class.doc-narrow]="tpl().narrow" [style.fontFamily]="fontStack()"
      [style.backgroundColor]="paperBg()" [style.boxShadow]="sidebarShadow()"
      [style.backgroundImage]="watermarkBg()" [style.backgroundRepeat]="'no-repeat'" [style.backgroundPosition]="'center'" [style.backgroundSize]="'65% 65%'">

      @if (headerImageUrl()) {
        <!-- A tenant-uploaded letterhead/banner image replaces the coded
             header entirely — it's expected to already carry the company's
             branding, so layering the templated header (with its own logo
             placement) on top of or above it would just duplicate that. -->
        <img [src]="headerImageUrl()" alt="" style="width:100%;max-height:160px;display:block;margin:0 auto;" />
      } @else {
      @switch (tpl().headerStyle) {
        @case ('minimalPlain') {
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;">
            <div style="display:flex;gap:10px;align-items:center;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:30px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:700;font-size:16px;" [style.color]="dark">{{ orgName() }}</div>
                <div style="font-size:10px;color:var(--faint);margin-top:2px;">
                  @if (orgAddress()) { {{ orgAddress() }} }
                  @if (orgGstin()) { <span> · GSTIN: {{ orgGstin() }}</span> }
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <div [style.color]="accentColor()" style="font-weight:600;font-size:15px;">{{ title('Invoice') }}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:4px;line-height:1.6;">
                {{ invoice().invoiceNumber }}<br />{{ fmtDate(invoice().date) }} · Due {{ fmtDate(invoice().dueDate) }}
              </div>
            </div>
          </div>
        }
        @case ('formalFramed') {
          <div [style.border]="'1px solid ' + dark" style="padding:16px 18px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div style="display:flex;gap:10px;align-items:flex-start;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:32px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:15px;letter-spacing:1px;text-transform:uppercase;" [style.color]="dark">{{ orgName() }}</div>
                <div style="font-size:10px;color:var(--muted);line-height:1.7;margin-top:4px;">
                  @if (orgAddress()) { <div>{{ orgAddress() }}</div> }
                  @if (orgGstin()) { <div>GSTIN: {{ orgGstin() }}</div> }
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <div [style.color]="accentColor()" style="font-weight:700;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">{{ title('Tax Invoice') }}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.9;">
                <div>No. <strong [style.color]="dark">{{ invoice().invoiceNumber }}</strong></div>
                <div>Date: {{ fmtDate(invoice().date) }}</div>
                <div style="color:var(--red);">Due: {{ fmtDate(invoice().dueDate) }}</div>
              </div>
            </div>
          </div>
        }
        @case ('diagonalBold') {
          <div class="inv-diag-bold">
            <div class="inv-diag-bold-left">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:34px;max-width:110px;object-fit:contain;margin-bottom:8px;" /> }
              <div style="font-weight:800;font-size:19px;letter-spacing:-0.5px;" [style.color]="dark">{{ orgName() }}</div>
              <div class="mono" style="font-size:11px;color:var(--muted);margin-top:6px;">{{ invoice().invoiceNumber }}</div>
            </div>
            <div class="inv-diag-bold-block" [style.background]="accentColor()">
              <div style="font-weight:800;font-size:26px;letter-spacing:-1px;color:#fff;text-transform:uppercase;">{{ title('Invoice') }}</div>
              <div style="font-size:10.5px;color:rgba(255,255,255,.9);margin-top:4px;">Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
        }
        @case ('splitCompact') {
          <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
            <div style="display:flex;gap:8px;align-items:center;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:26px;max-width:80px;object-fit:contain;" /> }
              <div style="font-weight:700;font-size:13.5px;" [style.color]="dark">{{ orgName() }}</div>
            </div>
            <div style="font-size:10.5px;color:var(--muted);">
              <span [style.color]="accentColor()" class="mono" style="font-weight:700;">{{ invoice().invoiceNumber }}</span>
              · Due {{ fmtDate(invoice().dueDate) }}
            </div>
          </div>
        }
        @case ('letterheadLedger') {
          <div style="position:relative;">
            @if (tpl().copyLabel) {
              <div style="position:absolute;top:0;right:0;border:1px solid var(--faint);border-radius:4px;padding:3px 8px;font-size:8.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">Original for Recipient</div>
            }
            <div [style.borderTop]="'2px solid ' + dark" [style.borderBottom]="'2px solid ' + dark" style="padding:14px 2px;text-align:center;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:32px;max-width:110px;object-fit:contain;margin-bottom:6px;" /> }
              <div style="font-weight:800;font-size:16px;letter-spacing:.5px;" [style.color]="dark">{{ orgName() }}</div>
              @if (orgAddress()) { <div style="font-size:10px;color:var(--muted);margin-top:3px;">{{ orgAddress() }}</div> }
              <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:8px;" [style.color]="dark">{{ title('Tax Invoice') }}</div>
              <div style="font-size:10px;margin-top:4px;" [style.color]="accentColor()">{{ invoice().invoiceNumber }} · Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
        }
        @case ('receiptCentered') {
          <div style="text-align:center;">
            @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:28px;max-width:90px;object-fit:contain;margin-bottom:6px;" /> }
            <div style="font-weight:800;font-size:14px;letter-spacing:.5px;text-transform:uppercase;" [style.color]="dark">{{ orgName() }}</div>
            @if (orgAddress()) { <div style="font-size:9.5px;color:var(--muted);margin-top:3px;">{{ orgAddress() }}</div> }
            <div style="font-size:11px;font-weight:700;margin-top:8px;text-transform:uppercase;" [style.color]="accentColor()">{{ title('Tax Invoice') }}</div>
            <div style="font-size:9.5px;margin-top:4px;color:var(--muted);">{{ invoice().invoiceNumber }} · {{ fmtDate(invoice().date) }}</div>
          </div>
        }
        @case ('ribbonCard') {
          <div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
              <div style="display:flex;gap:10px;align-items:center;">
                @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:32px;max-width:100px;object-fit:contain;" /> }
                <div style="font-weight:700;font-size:16px;" [style.color]="dark">{{ orgName() }}</div>
              </div>
              <span [style.background]="accentColor()" style="color:#fff;font-weight:700;font-size:10px;letter-spacing:.5px;padding:5px 14px;border-radius:0 8px 0 8px;text-transform:uppercase;">{{ title('Invoice') }}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px;background:var(--surface-alt);border-radius:10px;padding:10px 14px;">
              <div><div style="font-size:9px;color:var(--faint);text-transform:uppercase;">Invoice No</div><div style="font-size:11px;font-weight:600;margin-top:2px;" [style.color]="dark">{{ invoice().invoiceNumber }}</div></div>
              <div><div style="font-size:9px;color:var(--faint);text-transform:uppercase;">Date</div><div style="font-size:11px;font-weight:600;margin-top:2px;" [style.color]="dark">{{ fmtDate(invoice().date) }}</div></div>
              <div><div style="font-size:9px;color:var(--faint);text-transform:uppercase;">Due</div><div style="font-size:11px;font-weight:600;margin-top:2px;color:var(--red);">{{ fmtDate(invoice().dueDate) }}</div></div>
            </div>
          </div>
        }
        @case ('framedCentered') {
          <div [style.border]="'1px solid ' + accentColor()" style="border-radius:14px;padding:20px;text-align:center;">
            @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:34px;max-width:110px;object-fit:contain;margin-bottom:8px;" /> }
            <div style="font-weight:700;font-size:17px;letter-spacing:.5px;" [style.color]="dark">{{ orgName() }}</div>
            @if (orgAddress()) { <div style="font-size:10.5px;color:var(--muted);margin-top:4px;">{{ orgAddress() }}</div> }
            <div style="font-style:italic;font-size:16px;margin-top:10px;" [style.color]="accentColor()">{{ title('Invoice') }}</div>
            <div style="font-size:10.5px;margin-top:4px;" [style.color]="dark">{{ invoice().invoiceNumber }} · Due {{ fmtDate(invoice().dueDate) }}</div>
          </div>
        }
        @case ('sidebarStripe') {
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;">
            <div style="display:flex;gap:10px;align-items:center;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:32px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:17px;text-transform:uppercase;letter-spacing:.5px;" [style.color]="dark">{{ orgName() }}</div>
                <div style="font-size:10px;color:var(--faint);margin-top:3px;">
                  @if (orgAddress()) { {{ orgAddress() }} }
                  @if (orgGstin()) { <span> · GSTIN: {{ orgGstin() }}</span> }
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <div [style.color]="accentColor()" style="font-weight:800;font-size:17px;text-transform:uppercase;">{{ title('Invoice') }}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:4px;line-height:1.6;">
                {{ invoice().invoiceNumber }}<br />{{ fmtDate(invoice().date) }} · Due {{ fmtDate(invoice().dueDate) }}
              </div>
            </div>
          </div>
        }
        @case ('bannerBlock') {
          <div [style.background]="accentColor()" style="border-radius:10px;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
            <div style="display:flex;gap:10px;align-items:center;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:30px;max-width:100px;object-fit:contain;" /> }
              <div style="font-weight:800;font-size:17px;color:#fff;">{{ orgName() }}</div>
            </div>
            <div style="text-align:right;color:#fff;">
              <div style="font-weight:800;font-size:16px;letter-spacing:.3px;">{{ title('Invoice') }}</div>
              <div style="font-size:10px;opacity:.9;margin-top:2px;">{{ invoice().invoiceNumber }} · Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
          @if (orgAddress() || orgGstin()) {
            <div style="font-size:10px;color:var(--muted);margin-top:10px;">
              @if (orgAddress()) { {{ orgAddress() }} }
              @if (orgGstin()) { <span> · GSTIN: {{ orgGstin() }}</span> }
            </div>
          }
        }
        @case ('underlineAccent') {
          <div [style.borderBottom]="'3px solid ' + accentColor()" style="padding-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;">
            <div style="display:flex;gap:10px;align-items:center;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:30px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:700;font-size:16px;" [style.color]="dark">{{ orgName() }}</div>
                <div style="font-size:10px;color:var(--faint);margin-top:2px;">
                  @if (orgAddress()) { {{ orgAddress() }} }
                  @if (orgGstin()) { <span> · GSTIN: {{ orgGstin() }}</span> }
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <div [style.color]="accentColor()" style="font-weight:800;font-size:16px;text-transform:uppercase;letter-spacing:.5px;">{{ title('Invoice') }}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:4px;line-height:1.6;">
                {{ invoice().invoiceNumber }}<br />{{ fmtDate(invoice().date) }} · Due {{ fmtDate(invoice().dueDate) }}
              </div>
            </div>
          </div>
        }
        @case ('watermarkGhost') {
          <div style="text-align:center;">
            @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:30px;max-width:100px;object-fit:contain;margin-bottom:6px;" /> }
            <div style="font-weight:800;font-size:16px;" [style.color]="dark">{{ orgName() }}</div>
            @if (orgAddress()) { <div style="font-size:10px;color:var(--muted);margin-top:3px;">{{ orgAddress() }}</div> }
            <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:8px;" [style.color]="accentColor()">{{ title('Tax Invoice') }}</div>
            <div style="font-size:10px;margin-top:4px;color:var(--muted);">{{ invoice().invoiceNumber }} · Due {{ fmtDate(invoice().dueDate) }}</div>
          </div>
        }
        @case ('mastheadGrid') {
          <div style="display:grid;grid-template-columns:1.4fr 1fr;border:1px solid var(--border);border-radius:6px;overflow:hidden;">
            <div style="padding:14px 16px;">
              <div style="display:flex;gap:10px;align-items:center;">
                @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:28px;max-width:90px;object-fit:contain;" /> }
                <div style="font-weight:800;font-size:14px;" [style.color]="dark">{{ orgName() }}</div>
              </div>
              <div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.7;">
                @if (orgAddress()) { <div>{{ orgAddress() }}</div> }
                @if (orgGstin()) { <div>GSTIN: {{ orgGstin() }}</div> }
              </div>
            </div>
            <div style="border-left:1px solid var(--border);">
              <div style="padding:8px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:8px;">
                <span style="font-size:9px;color:var(--faint);text-transform:uppercase;">{{ title('Invoice') }} No</span>
                <span style="font-size:11px;font-weight:700;" [style.color]="dark">{{ invoice().invoiceNumber }}</span>
              </div>
              <div style="padding:8px 14px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:8px;">
                <span style="font-size:9px;color:var(--faint);text-transform:uppercase;">Date</span>
                <span style="font-size:11px;font-weight:700;" [style.color]="dark">{{ fmtDate(invoice().date) }}</span>
              </div>
              <div style="padding:8px 14px;display:flex;justify-content:space-between;gap:8px;">
                <span style="font-size:9px;color:var(--faint);text-transform:uppercase;">Due</span>
                <span style="font-size:11px;font-weight:700;color:var(--red);">{{ fmtDate(invoice().dueDate) }}</span>
              </div>
            </div>
          </div>
        }
        @case ('badgeCentered') {
          <div style="text-align:center;">
            @if (showLogo() && logoUrl()) {
              <img alt="" [src]="logoUrl()" style="height:44px;max-width:44px;object-fit:contain;border-radius:50%;margin-bottom:8px;" />
            } @else {
              <div [style.background]="accentColor()" style="width:44px;height:44px;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px;">{{ initials() }}</div>
            }
            <div style="font-weight:700;font-size:16px;letter-spacing:.3px;" [style.color]="dark">{{ orgName() }}</div>
            @if (orgAddress()) { <div style="font-size:10px;color:var(--muted);margin-top:3px;">{{ orgAddress() }}</div> }
            <div style="width:60px;height:1px;background:var(--faint);margin:10px auto;"></div>
            <div style="font-size:10.5px;color:var(--muted);">
              <span [style.color]="accentColor()" style="font-weight:700;">{{ title('Invoice') }}</span>
              · {{ invoice().invoiceNumber }} · Due {{ fmtDate(invoice().dueDate) }}
            </div>
          </div>
        }
        @case ('twoToneSplit') {
          <div style="display:flex;align-items:stretch;border-radius:8px;overflow:hidden;flex-wrap:wrap;">
            <div style="flex:1 1 55%;padding:16px 18px;display:flex;gap:10px;align-items:flex-start;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:30px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:15px;" [style.color]="dark">{{ orgName() }}</div>
                <div style="font-size:10px;color:var(--muted);line-height:1.7;margin-top:4px;">
                  @if (orgAddress()) { <div>{{ orgAddress() }}</div> }
                  @if (orgGstin()) { <div>GSTIN: {{ orgGstin() }}</div> }
                </div>
              </div>
            </div>
            <div [style.background]="accentColor()" style="flex:1 1 45%;padding:16px 18px;text-align:right;color:#fff;">
              <div style="font-weight:800;font-size:18px;letter-spacing:.3px;text-transform:uppercase;">{{ title('Invoice') }}</div>
              <div style="font-size:10px;opacity:.9;margin-top:6px;line-height:1.7;">
                <div>{{ invoice().invoiceNumber }}</div>
                <div>{{ fmtDate(invoice().date) }} · Due {{ fmtDate(invoice().dueDate) }}</div>
              </div>
            </div>
          </div>
        }
        @case ('stampSeal') {
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
            <div style="display:flex;gap:10px;align-items:center;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:30px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:700;font-size:15px;" [style.color]="dark">{{ orgName() }}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:3px;line-height:1.6;">
                  @if (orgAddress()) { <div>{{ orgAddress() }}</div> }
                  @if (orgGstin()) { <div>GSTIN: {{ orgGstin() }}</div> }
                </div>
              </div>
            </div>
            <div style="text-align:center;flex-shrink:0;">
              <div [style.borderColor]="accentColor()" style="width:64px;height:64px;border-radius:50%;border:2px dashed;display:flex;align-items:center;justify-content:center;transform:rotate(-8deg);">
                <div [style.color]="accentColor()" style="font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;text-align:center;line-height:1.3;">{{ title('Invoice') }}<br />Verified</div>
              </div>
              <div style="font-size:9.5px;color:var(--muted);margin-top:6px;">{{ invoice().invoiceNumber }}</div>
            </div>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:10px;">Date: {{ fmtDate(invoice().date) }} &nbsp;·&nbsp; Due {{ fmtDate(invoice().dueDate) }}</div>
        }
        @case ('spreadsheetGrid') {
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <tr>
              <td style="border:1px solid var(--border);padding:8px 10px;font-weight:700;" [style.color]="dark">{{ orgName() }}</td>
              <td style="border:1px solid var(--border);padding:8px 10px;font-weight:700;text-align:right;" [style.color]="accentColor()">{{ title('Invoice') }}</td>
            </tr>
            <tr>
              <td style="border:1px solid var(--border);padding:6px 10px;font-size:10px;color:var(--muted);">
                @if (orgAddress()) { {{ orgAddress() }} }
                @if (orgGstin()) { <span> · GSTIN: {{ orgGstin() }}</span> }
              </td>
              <td style="border:1px solid var(--border);padding:6px 10px;font-size:10px;color:var(--muted);text-align:right;">No. {{ invoice().invoiceNumber }}</td>
            </tr>
            <tr>
              <td style="border:1px solid var(--border);padding:6px 10px;font-size:10px;color:var(--muted);">&nbsp;</td>
              <td style="border:1px solid var(--border);padding:6px 10px;font-size:10px;color:var(--muted);text-align:right;">{{ fmtDate(invoice().date) }} · Due {{ fmtDate(invoice().dueDate) }}</td>
            </tr>
          </table>
        }
        @case ('wideLogoBar') {
          <div style="text-align:center;">
            @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:38px;max-width:160px;object-fit:contain;margin-bottom:8px;" /> }
            <div style="font-weight:800;font-size:19px;letter-spacing:-0.3px;" [style.color]="dark">{{ orgName() }}</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px;padding:10px 0;border-top:1px solid var(--faint);border-bottom:1px solid var(--faint);">
            <div><div style="font-size:8.5px;color:var(--faint);text-transform:uppercase;">{{ title('Invoice') }} No</div><div style="font-size:10.5px;font-weight:700;margin-top:2px;" [style.color]="dark">{{ invoice().invoiceNumber }}</div></div>
            <div><div style="font-size:8.5px;color:var(--faint);text-transform:uppercase;">Order Date</div><div style="font-size:10.5px;font-weight:700;margin-top:2px;" [style.color]="dark">{{ fmtDate(invoice().date) }}</div></div>
            <div><div style="font-size:8.5px;color:var(--faint);text-transform:uppercase;">Due Date</div><div style="font-size:10.5px;font-weight:700;margin-top:2px;color:var(--red);">{{ fmtDate(invoice().dueDate) }}</div></div>
            <div><div style="font-size:8.5px;color:var(--faint);text-transform:uppercase;">Payment</div><div style="font-size:10.5px;font-weight:700;margin-top:2px;" [style.color]="accentColor()">{{ invoice().totals.isIGST ? 'IGST' : 'CGST+' + stateTaxLabel() }}</div></div>
          </div>
        }
        @case ('columnRule') {
          <div style="display:flex;gap:24px;">
            <div style="flex:1;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:28px;max-width:100px;object-fit:contain;margin-bottom:6px;" /> }
              <div style="font-weight:700;font-size:15px;" [style.color]="dark">{{ orgName() }}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:4px;line-height:1.6;">
                @if (orgAddress()) { <div>{{ orgAddress() }}</div> }
                @if (orgGstin()) { <div>GSTIN: {{ orgGstin() }}</div> }
              </div>
            </div>
            <div style="width:1px;background:var(--border);align-self:stretch;"></div>
            <div style="flex:1;text-align:right;">
              <div [style.color]="accentColor()" style="font-weight:700;font-size:14px;">{{ title('Invoice') }}</div>
              <div style="font-size:10px;color:var(--muted);margin-top:6px;line-height:1.8;">
                <div>{{ invoice().invoiceNumber }}</div>
                <div>{{ fmtDate(invoice().date) }}</div>
                <div>Due {{ fmtDate(invoice().dueDate) }}</div>
              </div>
            </div>
          </div>
        }
        @case ('qrCorner') {
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
            <div style="display:flex;gap:10px;align-items:center;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:30px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:700;font-size:16px;" [style.color]="dark">{{ orgName() }}</div>
                <div style="font-size:10px;color:var(--faint);margin-top:2px;">
                  @if (orgAddress()) { {{ orgAddress() }} }
                  @if (orgGstin()) { <span> · GSTIN: {{ orgGstin() }}</span> }
                </div>
              </div>
            </div>
            <div style="text-align:right;display:flex;gap:10px;align-items:flex-start;">
              <div>
                <div [style.color]="accentColor()" style="font-weight:700;font-size:15px;">{{ title('Tax Invoice') }}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:4px;line-height:1.6;">
                  {{ invoice().invoiceNumber }}<br />Due {{ fmtDate(invoice().dueDate) }}
                </div>
              </div>
              <div class="inv-qr-grid" [style.borderColor]="accentColor()">
                @for (cell of qrCells; track $index) {
                  <span [style.background]="cell ? dark : 'transparent'"></span>
                }
              </div>
            </div>
          </div>
        }
        @case ('carbonBillBook') {
          <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;">
            <div>
              <div style="font-weight:700;font-size:15px;" [style.color]="dark">{{ orgName() }}</div>
              @if (orgAddress()) { <div style="font-size:9.5px;color:var(--muted);margin-top:2px;">{{ orgAddress() }}</div> }
            </div>
            <div [style.borderColor]="accentColor()" style="border:1.5px solid;border-radius:4px;padding:6px 12px;text-align:center;">
              <div style="font-size:8px;color:var(--faint);text-transform:uppercase;">Bill No.</div>
              <div [style.color]="accentColor()" class="mono" style="font-weight:700;font-size:13px;">{{ invoice().invoiceNumber }}</div>
            </div>
          </div>
          <div style="font-size:9.5px;color:var(--muted);margin-top:8px;">Date: {{ fmtDate(invoice().date) }} &nbsp;&nbsp; Due: {{ fmtDate(invoice().dueDate) }}</div>
        }
        @case ('fintechPills') {
          <div>
            <div style="display:flex;gap:10px;align-items:center;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:28px;max-width:100px;object-fit:contain;" /> }
              <div style="font-weight:800;font-size:17px;letter-spacing:-0.3px;" [style.color]="dark">{{ orgName() }}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
              <span [style.background]="hexToRgba(accentColor(), 0.12)" [style.color]="accentColor()" style="font-size:10px;font-weight:700;padding:5px 12px;border-radius:999px;">{{ title('Invoice') }} {{ invoice().invoiceNumber }}</span>
              <span style="font-size:10px;font-weight:600;padding:5px 12px;border-radius:999px;background:var(--surface-alt);color:var(--muted);">{{ fmtDate(invoice().date) }}</span>
              <span style="font-size:10px;font-weight:600;padding:5px 12px;border-radius:999px;background:var(--surface-alt);color:var(--red);">Due {{ fmtDate(invoice().dueDate) }}</span>
            </div>
          </div>
        }
        @default {
          <div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;">
            <div style="display:flex;gap:12px;align-items:flex-start;">
              @if (showLogo() && logoUrl()) { <img alt="" [src]="logoUrl()" style="height:36px;max-width:110px;object-fit:contain;" /> }
              <div>
                <div style="font-size:20px;font-weight:800;" [style.color]="dark">{{ orgName() || 'Your Business' }}</div>
                <div style="font-size:12px;color:var(--muted);line-height:1.7;margin-top:6px;">
                  @if (orgAddress()) { <div>{{ orgAddress() }}</div> }
                  <div>
                    @if (orgGstin()) { GSTIN: <span class="mono">{{ orgGstin() }}</span> }
                    @if (orgPan()) { &nbsp;|&nbsp; PAN: <span class="mono">{{ orgPan() }}</span> }
                  </div>
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              <div [style.color]="accentColor()" style="font-size:26px;font-weight:800;letter-spacing:-0.5px;text-transform:uppercase;">{{ title('Tax Invoice') }}</div>
              <div class="mono" style="font-size:15px;font-weight:700;margin-top:4px;">{{ invoice().invoiceNumber }}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:6px;">Invoice date: {{ fmtDate(invoice().date) }}</div>
              <div style="font-size:12px;color:var(--red);">Due date: {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
        }
      }
      }

      @switch (tpl().dividerStyle) {
        @case ('double') {
          <div [style.background]="accentColor()" style="height:2px;margin:22px 0 2px;"></div>
          <div [style.background]="accentColor()" style="height:1px;opacity:.5;margin-bottom:22px;"></div>
        }
        @case ('dotted') {
          <div [style.borderTop]="'2px dotted ' + accentColor()" style="margin:22px 0;"></div>
        }
        @case ('none') {
          <div style="margin-bottom:18px;"></div>
        }
        @case ('perforated') {
          <div style="display:flex;justify-content:space-between;margin:22px 0;">
            @for (d of perforationDots; track $index) {
              <span [style.background]="accentColor()" style="width:4px;height:4px;border-radius:50%;flex-shrink:0;"></span>
            }
          </div>
        }
        @default {
          <div [style.background]="accentColor()" style="height:3px;border-radius:4px;margin:22px 0 28px;"></div>
        }
      }

      <div class="inv-2col" [style.gap]="tpl().infoCard ? '14px' : '20px'"
        [style.padding]="tpl().infoCard ? '0' : '18px 20px'" style="border-radius:10px;"
        [style.background]="tpl().infoCard || tpl().tableStyle === 'boxed' ? 'transparent' : panelBg()"
        [style.border]="!tpl().infoCard && tpl().tableStyle === 'boxed' ? '1px solid ' + accentColor() : 'none'">
        <div [style.background]="tpl().infoCard ? panelBg() : 'transparent'"
          [style.borderRadius]="tpl().infoCard ? '10px' : '0'" [style.padding]="tpl().infoCard ? '14px 16px' : '0'">
          <div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;font-weight:700;">Bill To</div>
          <div style="font-size:15px;font-weight:700;margin-top:6px;" [style.color]="dark">{{ client()?.companyName }}</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.7;margin-top:4px;">
            @if (client()?.address) { <div>{{ client()?.address }}</div> }
            @if (client()?.gstin) { <div>GSTIN: <span class="mono">{{ client()?.gstin }}</span></div> }
            <div>State: {{ stateName(client()?.stateCode || '') }} ({{ client()?.stateCode }})</div>
          </div>
        </div>
        <div class="inv-2col-right" [style.background]="tpl().infoCard ? panelBg() : 'transparent'"
          [style.borderRadius]="tpl().infoCard ? '10px' : '0'" [style.padding]="tpl().infoCard ? '14px 16px' : '0'">
          <div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;font-weight:700;">Supply Details</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.9;margin-top:6px;">
            <div>Tax type: <strong [style.color]="dark">{{ invoice().totals.isIGST ? 'IGST (Inter-state)' : 'CGST + ' + stateTaxLabel() + ' (Intra-state)' }}</strong></div>
            <div>Place of supply: {{ stateName(client()?.stateCode || '') }}</div>
            <div>Terms: {{ invoice().paymentTerms || 'Net 15' }}</div>
          </div>
        </div>
      </div>

      @if (tpl().narrow && tpl().compact) {
        <!-- Receipt-style stacked rows: an 8-column table can't fit legibly in a
             narrow receipt column, so each item gets a description line plus one
             compact qty/rate/HSN/GST/total summary line underneath. -->
        <div class="inv-receipt-items">
          @for (item of invoice().items; track $index) {
            <div class="inv-receipt-row">
              <div class="inv-receipt-desc" [style.color]="dark">{{ item.desc }}</div>
              <div class="inv-receipt-meta">
                {{ item.qty }} × {{ fmtINR(itemRate(item)) }} · HSN {{ item.hsn || '—' }} · GST {{ itemTaxLabel(item) }}@if (item.discountPercent) { · less {{ item.discountPercent }}% }
                <span style="float:right;font-weight:700;" [style.color]="dark">{{ fmtINR(itemTotal(item)) }}</span>
              </div>
            </div>
          }
        </div>
      } @else {
        <table class="inv-items-table">
          <thead>
            <tr [style.background]="tpl().tableStyle === 'minimal' ? 'transparent' : (tpl().tableStyle === 'boxed' ? accentColor() : dark)"
              [style.borderBottom]="tpl().tableStyle === 'minimal' ? '1.5px solid var(--faint)' : 'none'">
              @for (h of ['#','Description','HSN/SAC','Qty','Rate','GST %','Tax Amt','Total']; track h) {
                <th [style.color]="tpl().tableStyle === 'minimal' ? 'var(--muted)' : (tpl().accentTint ? accentColor() : '#fff')"
                  [style.textAlign]="h === '#' || h === 'Description' || h === 'HSN/SAC' ? 'left' : 'right'"
                  [style.borderRight]="tpl().tableStyle === 'ledger' ? '1px solid rgba(255,255,255,.25)' : 'none'"
                  style="padding:11px 12px;font-size:11px;">{{ h }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (item of invoice().items; track $index; let i = $index) {
              <tr [style.background]="rowBg(i)"
                [style.border]="tpl().tableStyle === 'bordered' || tpl().tableStyle === 'boxed' || tpl().tableStyle === 'ledger' ? '1px solid #e5e7eb' : 'none'"
                style="border-bottom:1px solid #e0e7ff;">
                <td data-label="#" [style.borderRight]="ledgerRule()" style="padding:11px 12px;color:var(--faint);">{{ i + 1 }}</td>
                <td data-label="Description" [style.borderRight]="ledgerRule()" style="padding:11px 12px;font-weight:600;" [style.color]="dark">{{ item.desc }}</td>
                <td data-label="HSN/SAC" class="mono" [style.borderRight]="ledgerRule()" style="padding:11px 12px;color:var(--muted);">{{ item.hsn || '—' }}</td>
                <td data-label="Qty" [style.borderRight]="ledgerRule()" style="padding:11px 12px;text-align:right;color:var(--muted);">{{ item.qty }}</td>
                <td data-label="Rate" [style.borderRight]="ledgerRule()" style="padding:11px 12px;text-align:right;color:var(--muted);">
                  {{ fmtINR(itemRate(item)) }}
                  <!-- A discounted line shows its discount inline; there is no
                       dedicated column and the customer is entitled to see it. -->
                  @if (item.discountPercent) { <span style="display:block;font-size:10px;color:var(--faint);">less {{ item.discountPercent }}%</span> }
                </td>
                <td data-label="GST %" [style.borderRight]="ledgerRule()" style="padding:11px 12px;text-align:right;color:var(--muted);">{{ itemTaxLabel(item) }}</td>
                <td data-label="Tax Amt" [style.borderRight]="ledgerRule()" style="padding:11px 12px;text-align:right;color:#374151;">{{ fmtINR(itemTax(item)) }}</td>
                <td data-label="Total" style="padding:11px 12px;text-align:right;font-weight:600;" [style.color]="dark">{{ fmtINR(itemTotal(item)) }}</td>
              </tr>
            }
          </tbody>
        </table>
      }

      <div class="inv-2col" style="gap:20px;margin-top:26px;">
        <div style="display:grid;gap:14px;align-content:start;">
          @if (invoice().notes) {
            <div>
              <div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:5px;">Notes</div>
              <div style="font-size:12px;color:var(--muted);line-height:1.6;">{{ invoice().notes }}</div>
            </div>
          }
          @if (showBankDetails() && (bank().bank || bank().account)) {
            <!-- Falls back to the organisation's saved bank details, mirroring
                 pdfService.js exactly. The showBankDetails toggle used to render an
                 empty block for almost every invoice, because the details lived only
                 on the document and had to be retyped each time. -->
            <div style="border-radius:10px;padding:14px;" [style.background]="panelBg()">
              <div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px;">Bank Details</div>
              <div style="font-size:12px;color:#334155;line-height:1.8;">
                @if (bank().accountName) { <div>Name: {{ bank().accountName }}</div> }
                @if (bank().bank) { <div>Bank: {{ bank().bank }}@if (bank().branch) { <span> ({{ bank().branch }})</span> }</div> }
                @if (bank().account) { <div>A/c: <span class="mono">{{ bank().account }}</span></div> }
                @if (bank().ifsc) { <div>IFSC: <span class="mono">{{ bank().ifsc }}</span></div> }
                @if (bank().upiId) { <div>UPI: <span class="mono">{{ bank().upiId }}</span></div> }
              </div>
            </div>
          }
        </div>
        <div>
          <!-- Discount, cess, round-off and settlement rows only render when
               they carry a value, so a plain invoice looks exactly as before. -->
          <div style="border-radius:10px;padding:16px 18px;display:grid;gap:8px;font-size:13px;" [style.background]="panelBg()">
            @if (hasDiscount()) {
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Gross Amount</span><span style="font-weight:600;">{{ fmtINR(invoice().totals.grossSubtotal ?? invoice().totals.subtotal) }}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Discount</span><span style="font-weight:600;">−{{ fmtINR(invoice().totals.discountTotal ?? 0) }}</span></div>
            }
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">{{ hasDiscount() ? 'Taxable Value' : 'Subtotal' }}</span><span style="font-weight:600;">{{ fmtINR(invoice().totals.subtotal) }}</span></div>
            @if (invoice().totals.isIGST) {
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">IGST</span><span style="font-weight:600;">{{ fmtINR(invoice().totals.igst) }}</span></div>
            } @else {
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">CGST</span><span style="font-weight:600;">{{ fmtINR(invoice().totals.cgst) }}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">{{ stateTaxLabel() }}</span><span style="font-weight:600;">{{ fmtINR(invoice().totals.sgst) }}</span></div>
            }
            @if (cess() > 0) {
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Cess</span><span style="font-weight:600;">{{ fmtINR(cess()) }}</span></div>
            }
            @if (roundOff() !== 0) {
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Round Off</span><span style="font-weight:600;">{{ roundOff() > 0 ? '+' : '−' }}{{ fmtINR(roundOff() < 0 ? -roundOff() : roundOff()) }}</span></div>
            }
            <div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:2px;" [style.borderTop]="'2px solid ' + accentColor()">
              <span style="font-weight:700;">Total</span>
              <span style="font-weight:800;font-size:17px;" [style.color]="accentColor()">{{ fmtINR(invoice().totals.total) }}</span>
            </div>
            @if (amountPaid() > 0) {
              <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px dashed #d1d5db;"><span style="color:var(--muted);">Amount Paid</span><span style="font-weight:600;">{{ fmtINR(amountPaid()) }}</span></div>
              <div style="display:flex;justify-content:space-between;">
                <span style="font-weight:700;">Balance Due</span>
                <span style="font-weight:800;" [style.color]="accentColor()">{{ fmtINR(balanceDue()) }}</span>
              </div>
            }
          </div>
          @if (showAmountInWords()) {
            <div style="font-size:12px;background:#eef2ff;border-radius:8px;padding:10px 12px;margin-top:10px;line-height:1.6;" [style.color]="accentColor()">
              <strong>Amount in words:</strong> {{ numberToWords(invoice().totals.total) }}
            </div>
          }
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px;gap:20px;">
        <div style="font-size:11px;color:var(--faint);">This is a computer generated invoice.</div>
        @if (showSignature()) {
          <div style="text-align:center;">
            <!-- The uploaded signature, above the rule and height-capped so an
                 over-tall image cannot push into the block above it — the same
                 bound the letterhead image needed. -->
            @if (signatureSrc()) {
              <img [src]="signatureSrc()" alt="Signature"
                style="display:block;margin:0 auto 2px;max-height:38px;max-width:180px;object-fit:contain;" />
            }
            <div style="border-top:1.5px solid;padding-top:9px;font-size:12px;min-width:180px;" [style.color]="accentColor()" [style.borderColor]="accentColor()">Authorised Signatory</div>
            <div style="font-size:12px;font-weight:700;margin-top:3px;" [style.color]="dark">{{ invoiceDefaults().signatoryName || orgName() }}</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .inv-2col { display:grid; grid-template-columns:1fr 1fr; }
    .inv-2col-right { text-align:right; }

    .inv-diag-bold { position:relative; display:flex; justify-content:space-between; align-items:flex-start; padding:8px 4px 14px; overflow:hidden; gap:16px; }
    .inv-diag-bold-left { max-width:55%; }
    .inv-diag-bold-block { clip-path:polygon(18% 0,100% 0,100% 100%,42% 100%); padding:16px 26px 16px 46px; text-align:right; min-width:45%; }

    .inv-items-table { width:100%; border-collapse:collapse; margin-top:26px; }

    .inv-receipt-items { border-top:1px dashed var(--faint); border-bottom:1px dashed var(--faint); margin-top:22px; padding:10px 0; }
    .inv-receipt-row { padding:7px 0; border-bottom:1px dotted #e5e7eb; }
    .inv-receipt-row:last-child { border-bottom:none; }
    .inv-receipt-desc { font-weight:700; font-size:12px; }
    .inv-receipt-meta { font-size:10.5px; color:var(--muted); margin-top:2px; }

    .inv-qr-grid {
      display: grid; grid-template-columns: repeat(6, 1fr); gap: 1px;
      width: 36px; height: 36px; flex-shrink: 0;
      border: 1px solid; padding: 2px; box-sizing: border-box;
    }
    .inv-qr-grid span { display: block; }

    /* Mobile keeps true A4 page proportions — same --doc-fit shrink-to-fit
       zoom (from styles.css, driven by the .invoice-doc-wrap container
       query) that the desktop template-picker thumbnail uses, rather than
       reflowing into a stacked mobile-friendly card list. A phone viewing
       the print/download page or the template picker should see a
       correctly-scaled miniature of the exact page that gets downloaded —
       users can pinch-zoom (the app's viewport meta allows it) to read
       fine detail, same as viewing any PDF thumbnail on a phone. */
  `]
})
export class InvoiceDocumentComponent {
  invoice = input.required<InvoiceDocData>();
  client = input<InvoiceDocClient | null>(null);
  orgName = input('Your Business');
  orgAddress = input('');
  orgGstin = input('');
  orgPan = input('');
  templateId = input('modern-minimal');
  customTemplate = input<CustomInvoiceTemplate | null>(null);
  accentColor = input('#4f46e5');
  logoUrl = input('');
  /** A full-width letterhead/banner image, uploaded on the Invoice Templates
   *  page, that replaces the coded header entirely when set. */
  headerImageUrl = input('');
  showLogo = input(true);
  showSignature = input(true);
  showBankDetails = input(true);
  /**
   * The organisation's saved invoice defaults (2.3 #24–#26).
   *
   * Passed in rather than read from a service, because this component also renders the
   * live preview on the Invoice Templates page against *unsaved* edits — reading the
   * stored organisation there would show the previous values while the user is changing
   * them.
   */
  invoiceDefaults = input<{
    bankName?: string; accountName?: string; accountNumber?: string; ifsc?: string;
    branch?: string; upiId?: string; signatureUrl?: string; signatoryName?: string;
    termsAndConditions?: string;
  }>({});
  /**
   * The signature image, passed separately rather than read off
   * `invoiceDefaults.signatureUrl` (#45).
   *
   * It can be either a data URI (a not-yet-saved upload on the Invoice Templates
   * page) or a cacheable asset URL (a saved one), and an `<img src>` renders both
   * identically. Keeping it out of `invoiceDefaults` means that object never has
   * to be ambiguous about whether it carries image *data* or a *link* — which is
   * the distinction the save path depends on getting right.
   */
  signatureSrc = input('');
  showAmountInWords = input(true);
  /** Overrides every template's default title word ("Invoice"/"Tax Invoice") — e.g. "Proforma Invoice", "Bill", "Receipt". Empty keeps each template's own default. */
  invoiceTitleLabel = input('');

  /** Per-invoice bank details win; the organisation's fill the gaps. */
  bank = computed(() => {
    const perInvoice = this.invoice().bankDetails || {};
    const defaults = this.invoiceDefaults() || {};
    return {
      bank: perInvoice.bank || defaults.bankName || '',
      account: perInvoice.account || defaults.accountNumber || '',
      ifsc: perInvoice.ifsc || defaults.ifsc || '',
      accountName: defaults.accountName || '',
      branch: defaults.branch || '',
      upiId: defaults.upiId || ''
    };
  });

  dark = '#1e1b4b';
  readonly perforationDots = Array.from({ length: 40 });
  /** Purely decorative pixel-grid motif for QR Corner — evokes the QR panel
   *  on Indian GST e-invoices without claiming to encode real, scannable data. */
  readonly qrCells = Array.from({ length: 36 }, (_, i) => (i * 7919) % 13 < 6);
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  numberToWords = numberToWords;
  stateName = stateName;

  tpl = computed(() => resolveInvoiceTemplate(this.templateId(), this.customTemplate()));
  fontStack = computed(() => FONT_STACKS[this.tpl().font] || 'Arial, sans-serif');
  paperBg = computed(() => PAPER_TONE_COLORS[this.tpl().paperTone] || '#ffffff');
  panelBg = computed(() => (this.tpl().paperTone === 'cream' ? '#f6efe0' : '#f5f6ff'));

  /** A full-height inset color spine down the left edge (Agency Spine) — sits within the existing page padding so it never overlaps text.
   *  Layered on top of (not replacing) .invoice-doc's own CSS elevation shadow; returns null otherwise so that base CSS shadow applies undisturbed. */
  sidebarShadow = computed<string | null>(() => {
    if (this.tpl().headerStyle !== 'sidebarStripe') return null;
    return `inset 9mm 0 0 0 ${this.accentColor()}, 0 4px 24px rgba(79, 70, 229, 0.1)`;
  });

  /** A faint rotated "INVOICE" wordmark as the document's own background-image (always painted below descendant content, unlike an absolutely-positioned overlay). */
  watermarkBg = computed(() => {
    if (this.tpl().headerStyle !== 'watermarkGhost') return 'none';
    const label = (this.invoiceTitleLabel() || 'Invoice').toUpperCase();
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'><text x='250' y='265' font-size='72' font-family='Arial, sans-serif' font-weight='800' fill='#94a3b8' fill-opacity='0.14' text-anchor='middle' transform='rotate(-30 250 250)'>${label}</text></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  });

  /** Custom-template-wide title override, falling back to each header case's own default word. */
  title(def: string): string {
    return this.invoiceTitleLabel() || def;
  }

  initials(): string {
    const n = (this.orgName() || 'Y').trim();
    const parts = n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return parts || 'Y';
  }

  rowBg(i: number): string {
    if (this.tpl().tableStyle === 'zebra') {
      if (!(i % 2)) return 'transparent';
      return this.tpl().accentTint ? this.hexToRgba(this.accentColor(), 0.06) : '#fafbff';
    }
    return i % 2 && this.tpl().tableStyle !== 'minimal' ? '#fafbff' : 'transparent';
  }

  hexToRgba(hex: string, alpha: number): string {
    const h = (hex || '#4f46e5').replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(full, 16) || 0x4f46e5;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  ledgerRule(): string {
    return this.tpl().tableStyle === 'ledger' ? '1px solid #e5e7eb' : 'none';
  }

  /**
   * Prices one line the same way the backend's gstService.calculateLine does.
   *
   * These figures are display-only — the authoritative totals always come from
   * `invoice().totals`, computed server-side. Keeping the arithmetic identical
   * matters because this is the document the customer reads: the old version
   * was a bare `qty * rate * gstRate`, which ignored discounts, cess and
   * tax-inclusive rates and so disagreed with the total printed below it.
   */
  private line(item: InvoiceItem) {
    const qty = Number(item.qty) || 0;
    const rawRate = Number(item.rate) || 0;
    const gstRate = Number(item.gstRate) || 0;
    const cessRate = Number(item.cessRate) || 0;
    const lineDiscount = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
    const invoiceDiscount = Math.min(100, Math.max(0, Number(this.invoice().discountPercent) || 0));
    const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

    const rate = item.taxInclusive ? r2(rawRate / (1 + (gstRate + cessRate) / 100)) : rawRate;
    const gross = r2(qty * rate);
    const afterLine = r2(gross - r2(gross * lineDiscount / 100));
    const taxable = r2(afterLine - r2(afterLine * invoiceDiscount / 100));
    const tax = r2(taxable * gstRate / 100);
    const cess = r2(taxable * cessRate / 100);
    return { qty, rate, gstRate, cessRate, discountPercent: lineDiscount, gross, taxable, tax, cess, total: r2(taxable + tax + cess) };
  }

  /** Taxable unit rate — differs from what was typed on a tax-inclusive line. */
  itemRate(item: InvoiceItem): number {
    return this.line(item).rate;
  }

  /** GST plus cess for the line, which is what the "Tax Amt" column shows. */
  itemTax(item: InvoiceItem): number {
    const line = this.line(item);
    return line.tax + line.cess;
  }

  itemTotal(item: InvoiceItem): number {
    return this.line(item).total;
  }

  /** "18%" or "28% + 12%" when the line also carries cess. */
  itemTaxLabel(item: InvoiceItem): string {
    const line = this.line(item);
    return line.cessRate > 0 ? `${line.gstRate}% + ${line.cessRate}%` : `${line.gstRate}%`;
  }

  /** The state share is UTGST in the Union Territories that levy it. */
  stateTaxLabel(): string {
    return this.invoice().totals.isUT ? 'UTGST' : 'SGST';
  }

  hasDiscount(): boolean {
    return Number(this.invoice().totals.discountTotal) > 0;
  }

  roundOff(): number {
    return Number(this.invoice().totals.roundOff) || 0;
  }

  cess(): number {
    return Number(this.invoice().totals.cess) || 0;
  }

  amountPaid(): number {
    return Number(this.invoice().amountPaid) || 0;
  }

  balanceDue(): number {
    return Number(this.invoice().balanceDue) || 0;
  }
}
