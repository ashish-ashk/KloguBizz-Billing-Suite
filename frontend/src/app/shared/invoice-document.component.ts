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
  totals: InvoiceTotals;
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
    <div class="invoice-doc" [style.fontFamily]="fontStack()" [style.background]="paperBg()">

      @switch (tpl().headerStyle) {
        @case ('band') {
          <div [style.background]="accentColor()" style="border-radius:10px 10px 0 0;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:12px;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:40px;max-width:120px;object-fit:contain;" /> }
              <div>
                <div style="color:#fff;font-weight:800;font-size:15px;">{{ orgName() }}</div>
                @if (orgAddress()) { <div style="color:rgba(255,255,255,.8);font-size:10.5px;margin-top:2px;">{{ orgAddress() }}</div> }
              </div>
            </div>
            <div style="color:#fff;font-weight:800;font-size:20px;letter-spacing:-0.4px;">TAX INVOICE</div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:18px;padding:10px 4px;font-size:11px;">
            <span style="color:var(--muted);">Invoice #: <strong [style.color]="dark">{{ invoice().invoiceNumber }}</strong></span>
            <span style="color:var(--red);font-weight:600;">Due: {{ fmtDate(invoice().dueDate) }}</span>
          </div>
        }
        @case ('bandLarge') {
          <div [style.background]="accentColor()" style="border-radius:10px 10px 0 0;padding:26px 22px;text-align:center;">
            @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:36px;max-width:120px;object-fit:contain;margin-bottom:8px;" /> }
            <div style="color:#fff;font-weight:800;font-size:26px;letter-spacing:-0.5px;">TAX INVOICE</div>
            <div style="color:rgba(255,255,255,.85);font-size:12px;margin-top:6px;">{{ orgName() }} · {{ invoice().invoiceNumber }} · Due {{ fmtDate(invoice().dueDate) }}</div>
          </div>
        }
        @case ('gradient') {
          <div style="position:relative;border-radius:10px 10px 0 0;padding:22px;text-align:center;overflow:hidden;" [style.background]="accentColor()">
            <div style="position:absolute;inset:0;left:35%;background:rgba(0,0,0,0.22);"></div>
            <div style="position:relative;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:34px;max-width:110px;object-fit:contain;margin-bottom:6px;" /> }
              <div style="color:#fff;font-weight:800;font-size:20px;">TAX INVOICE</div>
              <div style="color:rgba(255,255,255,.9);font-size:11.5px;margin-top:4px;">{{ orgName() }} · {{ invoice().invoiceNumber }}</div>
              <div style="color:rgba(255,255,255,.85);font-size:10.5px;margin-top:2px;">Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
        }
        @case ('diagonal') {
          <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start;padding:8px 4px 14px;overflow:hidden;">
            <div style="display:flex;gap:12px;align-items:center;max-width:55%;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:32px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:16px;" [style.color]="dark">{{ orgName() }}</div>
                @if (orgAddress()) { <div style="font-size:10.5px;color:var(--muted);margin-top:2px;">{{ orgAddress() }}</div> }
              </div>
            </div>
            <div [style.background]="accentColor()" style="clip-path:polygon(30% 0,100% 0,100% 100%,55% 100%);padding:12px 24px 12px 40px;color:#fff;text-align:right;min-width:220px;">
              <div style="font-weight:800;font-size:16px;">INVOICE</div>
              <div style="font-size:10.5px;margin-top:4px;">{{ invoice().invoiceNumber }}</div>
              <div style="font-size:10.5px;color:rgba(255,255,255,.9);">Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
        }
        @case ('sidebar') {
          <div style="display:flex;gap:18px;padding-bottom:10px;">
            <div [style.background]="accentColor()" style="width:8px;border-radius:6px;flex-shrink:0;"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex:1;gap:16px;flex-wrap:wrap;">
              <div style="display:flex;gap:12px;align-items:center;">
                @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:34px;max-width:110px;object-fit:contain;" /> }
                <div>
                  <div style="font-weight:800;font-size:17px;" [style.color]="dark">{{ orgName() }}</div>
                  @if (orgAddress()) { <div style="font-size:11px;color:var(--muted);margin-top:2px;">{{ orgAddress() }}</div> }
                </div>
              </div>
              <div style="text-align:right;">
                <div [style.color]="accentColor()" style="font-weight:800;font-size:20px;">INVOICE</div>
                <div style="font-size:11px;margin-top:4px;" [style.color]="dark">{{ invoice().invoiceNumber }}</div>
                <div style="font-size:11px;color:var(--red);">Due {{ fmtDate(invoice().dueDate) }}</div>
              </div>
            </div>
          </div>
        }
        @case ('split') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div style="display:flex;gap:10px;align-items:flex-start;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:30px;max-width:90px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:14px;" [style.color]="dark">{{ orgName() }}</div>
                @if (orgGstin()) { <div style="font-size:10px;color:var(--muted);margin-top:2px;">GSTIN: {{ orgGstin() }}</div> }
              </div>
            </div>
            <div style="text-align:right;">
              <div [style.color]="accentColor()" style="font-weight:800;font-size:15px;">TAX INVOICE</div>
              <div style="font-size:10.5px;color:var(--muted);margin-top:3px;">{{ invoice().invoiceNumber }} · {{ fmtDate(invoice().date) }}</div>
              <div style="font-size:10.5px;color:var(--red);">Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
        }
        @case ('boxed') {
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div [style.border]="'1px solid ' + accentColor()" style="border-radius:8px;padding:12px 14px;display:flex;gap:10px;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:28px;max-width:90px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:13px;" [style.color]="dark">{{ orgName() }}</div>
                @if (orgAddress()) { <div style="font-size:10px;color:var(--muted);margin-top:2px;">{{ orgAddress() }}</div> }
              </div>
            </div>
            <div [style.border]="'1px solid ' + accentColor()" style="border-radius:8px;padding:12px 14px;text-align:right;">
              <div [style.color]="accentColor()" style="font-weight:800;font-size:14px;">TAX INVOICE</div>
              <div style="font-size:10.5px;color:var(--muted);margin-top:3px;">{{ invoice().invoiceNumber }}</div>
              <div style="font-size:10.5px;color:var(--red);">Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
        }
        @case ('centered') {
          <div style="text-align:center;padding-bottom:6px;">
            @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:36px;max-width:120px;object-fit:contain;margin-bottom:8px;" /> }
            <div style="font-weight:800;font-size:17px;" [style.color]="dark">{{ orgName() }}</div>
            @if (orgAddress()) { <div style="font-size:11px;color:var(--muted);margin-top:3px;">{{ orgAddress() }}</div> }
            <div [style.color]="accentColor()" style="font-weight:800;font-size:19px;margin-top:10px;">TAX INVOICE</div>
            <div style="font-size:11px;margin-top:4px;" [style.color]="dark">{{ invoice().invoiceNumber }} · {{ fmtDate(invoice().date) }} · Due {{ fmtDate(invoice().dueDate) }}</div>
          </div>
        }
        @default {
          <div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;">
            <div style="display:flex;gap:12px;align-items:flex-start;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:36px;max-width:110px;object-fit:contain;" /> }
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
              <div [style.color]="accentColor()" style="font-size:26px;font-weight:800;letter-spacing:-0.5px;">TAX INVOICE</div>
              <div class="mono" style="font-size:15px;font-weight:700;margin-top:4px;">{{ invoice().invoiceNumber }}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:6px;">Invoice date: {{ fmtDate(invoice().date) }}</div>
              <div style="font-size:12px;color:var(--red);">Due date: {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
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
        @default {
          <div [style.background]="accentColor()" style="height:3px;border-radius:4px;margin:22px 0 28px;"></div>
        }
      }

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:18px 20px;border-radius:10px;"
        [style.background]="tpl().tableStyle === 'boxed' ? 'transparent' : panelBg()"
        [style.border]="tpl().tableStyle === 'boxed' ? '1px solid ' + accentColor() : 'none'">
        <div>
          <div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;font-weight:700;">Bill To</div>
          <div style="font-size:15px;font-weight:700;margin-top:6px;" [style.color]="dark">{{ client()?.companyName }}</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.7;margin-top:4px;">
            @if (client()?.address) { <div>{{ client()?.address }}</div> }
            @if (client()?.gstin) { <div>GSTIN: <span class="mono">{{ client()?.gstin }}</span></div> }
            <div>State: {{ stateName(client()?.stateCode || '') }} ({{ client()?.stateCode }})</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;font-weight:700;">Supply Details</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.9;margin-top:6px;">
            <div>Tax type: <strong [style.color]="dark">{{ invoice().totals.isIGST ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)' }}</strong></div>
            <div>Place of supply: {{ stateName(client()?.stateCode || '') }}</div>
            <div>Terms: {{ invoice().paymentTerms || 'Net 15' }}</div>
          </div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:26px;">
        <thead>
          <tr [style.background]="tpl().tableStyle === 'minimal' ? 'transparent' : (tpl().tableStyle === 'boxed' ? accentColor() : dark)"
            [style.borderBottom]="tpl().tableStyle === 'minimal' ? '1.5px solid var(--faint)' : 'none'">
            @for (h of ['#','Description','HSN/SAC','Qty','Rate','GST %','Tax Amt','Total']; track h) {
              <th [style.color]="tpl().tableStyle === 'minimal' ? 'var(--muted)' : '#fff'"
                [style.textAlign]="h === '#' || h === 'Description' || h === 'HSN/SAC' ? 'left' : 'right'"
                style="padding:11px 12px;font-size:11px;">{{ h }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (item of invoice().items; track $index; let i = $index) {
            <tr [style.background]="rowBg(i)" [style.border]="tpl().tableStyle === 'bordered' || tpl().tableStyle === 'boxed' ? '1px solid #e5e7eb' : 'none'"
              style="border-bottom:1px solid #e0e7ff;">
              <td style="padding:11px 12px;color:var(--faint);">{{ i + 1 }}</td>
              <td style="padding:11px 12px;font-weight:600;" [style.color]="dark">{{ item.desc }}</td>
              <td class="mono" style="padding:11px 12px;color:var(--muted);">{{ item.hsn || '—' }}</td>
              <td style="padding:11px 12px;text-align:right;color:var(--muted);">{{ item.qty }}</td>
              <td style="padding:11px 12px;text-align:right;color:var(--muted);">{{ fmtINR(item.rate) }}</td>
              <td style="padding:11px 12px;text-align:right;color:var(--muted);">{{ item.gstRate }}%</td>
              <td style="padding:11px 12px;text-align:right;color:#374151;">{{ fmtINR(itemTax(item)) }}</td>
              <td style="padding:11px 12px;text-align:right;font-weight:600;" [style.color]="dark">{{ fmtINR(itemTotal(item)) }}</td>
            </tr>
          }
        </tbody>
      </table>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:26px;">
        <div style="display:grid;gap:14px;align-content:start;">
          @if (invoice().notes) {
            <div>
              <div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:5px;">Notes</div>
              <div style="font-size:12px;color:var(--muted);line-height:1.6;">{{ invoice().notes }}</div>
            </div>
          }
          @if (showBankDetails() && (invoice().bankDetails?.bank || invoice().bankDetails?.account)) {
            <div style="border-radius:10px;padding:14px;" [style.background]="panelBg()">
              <div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:6px;">Bank Details</div>
              <div style="font-size:12px;color:#334155;line-height:1.8;">
                @if (invoice().bankDetails?.bank) { <div>Bank: {{ invoice().bankDetails?.bank }}</div> }
                @if (invoice().bankDetails?.account) { <div>A/c: <span class="mono">{{ invoice().bankDetails?.account }}</span></div> }
                @if (invoice().bankDetails?.ifsc) { <div>IFSC: <span class="mono">{{ invoice().bankDetails?.ifsc }}</span></div> }
              </div>
            </div>
          }
        </div>
        <div>
          <div style="border-radius:10px;padding:16px 18px;display:grid;gap:8px;font-size:13px;" [style.background]="panelBg()">
            <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">Subtotal</span><span style="font-weight:600;">{{ fmtINR(invoice().totals.subtotal) }}</span></div>
            @if (invoice().totals.isIGST) {
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">IGST</span><span style="font-weight:600;">{{ fmtINR(invoice().totals.igst) }}</span></div>
            } @else {
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">CGST</span><span style="font-weight:600;">{{ fmtINR(invoice().totals.cgst) }}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:var(--muted);">SGST</span><span style="font-weight:600;">{{ fmtINR(invoice().totals.sgst) }}</span></div>
            }
            <div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:2px;" [style.borderTop]="'2px solid ' + accentColor()">
              <span style="font-weight:700;">Total</span>
              <span style="font-weight:800;font-size:17px;" [style.color]="accentColor()">{{ fmtINR(invoice().totals.total) }}</span>
            </div>
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
            <div style="border-top:1.5px solid;padding-top:9px;font-size:12px;min-width:180px;" [style.color]="accentColor()" [style.borderColor]="accentColor()">Authorised Signatory</div>
            <div style="font-size:12px;font-weight:700;margin-top:3px;" [style.color]="dark">{{ orgName() }}</div>
          </div>
        }
      </div>
    </div>
  `
})
export class InvoiceDocumentComponent {
  invoice = input.required<InvoiceDocData>();
  client = input<InvoiceDocClient | null>(null);
  orgName = input('Your Business');
  orgAddress = input('');
  orgGstin = input('');
  orgPan = input('');
  templateId = input('classic-corporate');
  customTemplate = input<CustomInvoiceTemplate | null>(null);
  accentColor = input('#4f46e5');
  logoUrl = input('');
  showLogo = input(true);
  showSignature = input(true);
  showBankDetails = input(true);
  showAmountInWords = input(true);

  dark = '#1e1b4b';
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  numberToWords = numberToWords;
  stateName = stateName;

  tpl = computed(() => resolveInvoiceTemplate(this.templateId(), this.customTemplate()));
  fontStack = computed(() => FONT_STACKS[this.tpl().font] || 'Arial, sans-serif');
  paperBg = computed(() => PAPER_TONE_COLORS[this.tpl().paperTone] || '#ffffff');
  panelBg = computed(() => (this.tpl().paperTone === 'cream' ? '#f6efe0' : '#f5f6ff'));

  rowBg(i: number): string {
    if (this.tpl().tableStyle === 'zebra') return i % 2 ? '#fafbff' : '#fff';
    return i % 2 && this.tpl().tableStyle !== 'minimal' ? '#fafbff' : 'transparent';
  }

  itemTax(item: { qty: number; rate: number; gstRate: number }): number {
    return item.qty * item.rate * item.gstRate / 100;
  }

  itemTotal(item: { qty: number; rate: number; gstRate: number }): number {
    return item.qty * item.rate + this.itemTax(item);
  }
}
