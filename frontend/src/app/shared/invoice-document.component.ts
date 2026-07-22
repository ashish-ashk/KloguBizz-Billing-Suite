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
          <div style="display:flex;justify-content:flex-end;gap:18px;padding:10px 4px;font-size:11px;flex-wrap:wrap;">
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
          <div class="inv-diag">
            <div class="inv-diag-left">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:32px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:16px;" [style.color]="dark">{{ orgName() }}</div>
                @if (orgAddress()) { <div style="font-size:10.5px;color:var(--muted);margin-top:2px;">{{ orgAddress() }}</div> }
              </div>
            </div>
            <div class="inv-diag-ribbon" [style.background]="accentColor()">
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
              <div class="inv-sidebar-right">
                <div [style.color]="accentColor()" style="font-weight:800;font-size:20px;">INVOICE</div>
                <div style="font-size:11px;margin-top:4px;" [style.color]="dark">{{ invoice().invoiceNumber }}</div>
                <div style="font-size:11px;color:var(--red);">Due {{ fmtDate(invoice().dueDate) }}</div>
              </div>
            </div>
          </div>
        }
        @case ('split') {
          <div class="inv-2col" style="gap:16px;">
            <div style="display:flex;gap:10px;align-items:flex-start;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:30px;max-width:90px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:14px;" [style.color]="dark">{{ orgName() }}</div>
                @if (orgGstin()) { <div style="font-size:10px;color:var(--muted);margin-top:2px;">GSTIN: {{ orgGstin() }}</div> }
              </div>
            </div>
            <div class="inv-2col-right">
              <div [style.color]="accentColor()" style="font-weight:800;font-size:15px;">TAX INVOICE</div>
              <div style="font-size:10.5px;color:var(--muted);margin-top:3px;">{{ invoice().invoiceNumber }} · {{ fmtDate(invoice().date) }}</div>
              <div style="font-size:10.5px;color:var(--red);">Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
        }
        @case ('boxed') {
          <div class="inv-2col" style="gap:16px;">
            <div [style.border]="'1px solid ' + accentColor()" style="border-radius:8px;padding:12px 14px;display:flex;gap:10px;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:28px;max-width:90px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:13px;" [style.color]="dark">{{ orgName() }}</div>
                @if (orgAddress()) { <div style="font-size:10px;color:var(--muted);margin-top:2px;">{{ orgAddress() }}</div> }
              </div>
            </div>
            <div class="inv-2col-right" [style.border]="'1px solid ' + accentColor()" style="border-radius:8px;padding:12px 14px;">
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
        @case ('ribbon') {
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
            <div style="display:flex;gap:12px;align-items:flex-start;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:34px;max-width:110px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:16px;" [style.color]="dark">{{ orgName() }}</div>
                @if (orgAddress()) { <div style="font-size:10.5px;color:var(--muted);margin-top:2px;">{{ orgAddress() }}</div> }
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              <span [style.background]="accentColor()" style="color:#fff;font-weight:800;font-size:10.5px;letter-spacing:.5px;padding:4px 12px;border-radius:0 6px 0 6px;">INVOICE</span>
              <div style="font-size:10.5px;color:var(--muted);">{{ invoice().invoiceNumber }}</div>
              <div style="font-size:10.5px;color:var(--red);">Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
          </div>
        }
        @case ('letterhead') {
          <div [style.borderTop]="'2px solid ' + dark" [style.borderBottom]="'1px solid ' + dark" style="padding:14px 2px;text-align:center;">
            @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:32px;max-width:110px;object-fit:contain;margin-bottom:6px;" /> }
            <div style="font-weight:800;font-size:17px;letter-spacing:.5px;" [style.color]="dark">{{ orgName() }}</div>
            @if (orgAddress()) { <div style="font-size:10.5px;color:var(--muted);margin-top:3px;">{{ orgAddress() }}</div> }
            <div style="font-size:10.5px;margin-top:8px;" [style.color]="accentColor()">TAX INVOICE · {{ invoice().invoiceNumber }} · Due {{ fmtDate(invoice().dueDate) }}</div>
          </div>
        }
        @case ('stub') {
          <div class="inv-stub">
            <div style="flex:1;padding:14px 16px;display:flex;gap:10px;align-items:center;">
              @if (showLogo() && logoUrl()) { <img [src]="logoUrl()" style="height:30px;max-width:100px;object-fit:contain;" /> }
              <div>
                <div style="font-weight:800;font-size:14px;" [style.color]="dark">{{ orgName() }}</div>
                @if (orgAddress()) { <div style="font-size:10px;color:var(--muted);margin-top:2px;">{{ orgAddress() }}</div> }
              </div>
            </div>
            <div class="inv-stub-right">
              <div [style.color]="accentColor()" style="font-weight:800;font-size:13px;">INVOICE</div>
              <div style="font-size:10.5px;margin-top:4px;" [style.color]="dark">{{ invoice().invoiceNumber }}</div>
              <div style="font-size:10.5px;color:var(--red);">Due {{ fmtDate(invoice().dueDate) }}</div>
            </div>
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

      <div class="inv-2col" style="gap:20px;padding:18px 20px;border-radius:10px;"
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
        <div class="inv-2col-right">
          <div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;font-weight:700;">Supply Details</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.9;margin-top:6px;">
            <div>Tax type: <strong [style.color]="dark">{{ invoice().totals.isIGST ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)' }}</strong></div>
            <div>Place of supply: {{ stateName(client()?.stateCode || '') }}</div>
            <div>Terms: {{ invoice().paymentTerms || 'Net 15' }}</div>
          </div>
        </div>
      </div>

      <table class="inv-items-table">
        <thead>
          <tr [style.background]="tpl().tableStyle === 'minimal' ? 'transparent' : (tpl().tableStyle === 'boxed' ? accentColor() : dark)"
            [style.borderBottom]="tpl().tableStyle === 'minimal' ? '1.5px solid var(--faint)' : 'none'">
            @for (h of ['#','Description','HSN/SAC','Qty','Rate','GST %','Tax Amt','Total']; track h) {
              <th [style.color]="tpl().tableStyle === 'minimal' ? 'var(--muted)' : '#fff'"
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
              <td data-label="Rate" [style.borderRight]="ledgerRule()" style="padding:11px 12px;text-align:right;color:var(--muted);">{{ fmtINR(item.rate) }}</td>
              <td data-label="GST %" [style.borderRight]="ledgerRule()" style="padding:11px 12px;text-align:right;color:var(--muted);">{{ item.gstRate }}%</td>
              <td data-label="Tax Amt" [style.borderRight]="ledgerRule()" style="padding:11px 12px;text-align:right;color:#374151;">{{ fmtINR(itemTax(item)) }}</td>
              <td data-label="Total" style="padding:11px 12px;text-align:right;font-weight:600;" [style.color]="dark">{{ fmtINR(itemTotal(item)) }}</td>
            </tr>
          }
        </tbody>
      </table>

      <div class="inv-2col" style="gap:20px;margin-top:26px;">
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
  `,
  styles: [`
    .inv-2col { display:grid; grid-template-columns:1fr 1fr; }
    .inv-2col-right { text-align:right; }

    .inv-diag { position:relative; display:flex; justify-content:space-between; align-items:flex-start; padding:8px 4px 14px; overflow:hidden; }
    .inv-diag-left { display:flex; gap:12px; align-items:center; max-width:55%; }
    .inv-diag-ribbon { clip-path:polygon(30% 0,100% 0,100% 100%,55% 100%); padding:12px 24px 12px 40px; color:#fff; text-align:right; min-width:220px; }

    .inv-sidebar-right { text-align:right; }

    .inv-stub { display:flex; border:1.5px solid #d1d5db; border-radius:8px; overflow:hidden; }
    .inv-stub-right { border-left:1.5px solid #d1d5db; padding:14px 16px; text-align:right; min-width:150px; }

    .inv-items-table { width:100%; border-collapse:collapse; margin-top:26px; }

    /* Real reflow for narrow renders of this document — the wrapping
       .invoice-doc-wrap establishes the "invoice-doc" containment context
       (see styles.css), since this component is squeezed to ~320-380px in
       the template picker's sticky preview even on a wide desktop viewport,
       where a viewport media query would never fire. Print severs this
       context (see the @media print override in styles.css) so the PDF/
       print output always stays full-width regardless of screen size. */
    @container invoice-doc (max-width: 640px) {
      .invoice-doc { padding: 16px 14px; }

      .inv-2col { grid-template-columns: 1fr; }
      .inv-2col-right { text-align: left; }

      .inv-diag { flex-direction: column; gap: 12px; }
      .inv-diag-left { max-width: 100%; }
      .inv-diag-ribbon { clip-path: none; min-width: 0; width: 100%; text-align: left; border-radius: 8px; padding: 10px 14px; }

      .inv-sidebar-right { text-align: left; }

      .inv-stub { flex-direction: column; }
      .inv-stub-right { border-left: none; border-top: 1.5px solid #d1d5db; text-align: left; min-width: 0; }

      .inv-items-table thead { display: none; }
      .inv-items-table, .inv-items-table tbody, .inv-items-table tr, .inv-items-table td { display: block; width: 100%; }
      .inv-items-table tr { border: 1px solid #e5e7eb !important; border-radius: 8px; margin-bottom: 10px; padding: 10px 12px; }
      .inv-items-table td { padding: 2px 0 !important; border: none !important; text-align: left !important; background: transparent !important; }
      .inv-items-table td[data-label="#"] { display: none; }
      .inv-items-table td[data-label]::before { content: attr(data-label) ": "; color: var(--faint); font-weight: 600; }
      .inv-items-table td[data-label="Description"]::before { content: ""; }
      .inv-items-table td[data-label="Description"] { font-size: 13px !important; margin-bottom: 2px; }
      .inv-items-table td[data-label="HSN/SAC"] { font-size: 10.5px !important; margin-bottom: 6px; }
      .inv-items-table td[data-label="Qty"],
      .inv-items-table td[data-label="Rate"],
      .inv-items-table td[data-label="GST %"] { display: inline-block !important; width: auto !important; margin-right: 14px; font-size: 11px !important; }
      .inv-items-table td[data-label="Tax Amt"] { font-size: 11px !important; margin-top: 4px; }
      .inv-items-table td[data-label="Total"] { font-weight: 800 !important; font-size: 14px !important; border-top: 1px dashed #e5e7eb !important; margin-top: 8px; padding-top: 6px !important; }
    }
  `]
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
  readonly perforationDots = Array.from({ length: 40 });
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

  ledgerRule(): string {
    return this.tpl().tableStyle === 'ledger' ? '1px solid #e5e7eb' : 'none';
  }

  itemTax(item: { qty: number; rate: number; gstRate: number }): number {
    return item.qty * item.rate * item.gstRate / 100;
  }

  itemTotal(item: { qty: number; rate: number; gstRate: number }): number {
    return item.qty * item.rate + this.itemTax(item);
  }
}
