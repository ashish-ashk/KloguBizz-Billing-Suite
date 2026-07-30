import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { EmptyStateComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Gstr1Report, Gstr3bReport, ItcRegister } from '../../core/models';
import { downloadBlob, fmtINR } from '../../core/format';

type Tab = 'gstr1' | 'gstr3b' | 'itc';

/**
 * GSTR-1, GSTR-3B and the ITC register (Phase 5).
 *
 * The existing Reports page is a month × rate summary — useful for a glance and
 * impossible to file from. A return is not a total, it is a set of sections, and which
 * section a document lands in depends on who the buyer was, where the supply happened,
 * how large it was and how it was taxed.
 *
 * The page is deliberately explicit that it is a preparation aid: the figures come from
 * what was recorded here, which is not the same as what the GSTN portal holds, and a
 * filing decision needs the two reconciled. Saying so is not hedging — a tool that
 * implies certification it does not have is worse than one that doesn't try.
 */
@Component({
  selector: 'app-gst-returns',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, IconComponent, EmptyStateComponent, SkeletonRowsComponent],
  template: `
    <app-shell title="GST Returns" subtitle="Section-wise GSTR-1, the GSTR-3B computation, and your input tax credit">
      <input actions type="month" class="input" style="max-width:170px" [ngModel]="month()" (ngModelChange)="onMonth($event)" />
      @if (tab() === 'gstr1') {
        <button actions class="btn secondary" type="button" [disabled]="downloading()" (click)="downloadCsv()">
          @if (downloading()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> CSV
        </button>
      }
      @if (tab() === 'gstr1') {
        <button actions class="btn primary" type="button" [disabled]="downloading()" (click)="downloadJson()">
          @if (downloading()) { <span class="spinner"></span> } <app-icon name="download" [size]="14" /> GSTN JSON
        </button>
      }

      <div class="toolbar">
        <div class="tabs">
          <button type="button" [class.active]="tab() === 'gstr1'" (click)="tab.set('gstr1')">GSTR-1</button>
          <button type="button" [class.active]="tab() === 'gstr3b'" (click)="onGstr3bTab()">GSTR-3B</button>
          <button type="button" [class.active]="tab() === 'itc'" (click)="onItcTab()">Input tax credit</button>
        </div>
      </div>

      <div class="info-box" style="margin-bottom:18px;display:flex;gap:8px;align-items:flex-start">
        <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
        <span>
          Prepared from your records in KloguBizz. Reconcile against GSTR-2B and your books
          before filing — this is a preparation aid, not a filing service.
        </span>
      </div>

      @if (loading()) { <div class="card flush"><app-skeleton-rows [count]="6" /></div> }

      @if (tab() === 'gstr1' && gstr1(); as r) {
        @if (!r.supplier.gstin) {
          <div class="info-box warn" style="margin-bottom:18px;display:flex;gap:8px;align-items:flex-start">
            <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
            <span>
              Your GSTIN is not set, and a GSTR-1 file is filed against it. Add it under your
              organisation profile before downloading.
            </span>
          </div>
        }

        <section class="grid grid-4" style="margin-bottom:20px">
          <div class="card metric indigo">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Taxable value</span><span class="m-icon"><app-icon name="rupee" [size]="15" /></span></div>
            <div class="value">{{ fmtINR(r.summary.taxable, true) }}</div>
            <div class="sub">{{ r.summary.invoiceCount }} invoice{{ r.summary.invoiceCount === 1 ? '' : 's' }}</div>
          </div>
          <div class="card metric purple">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Tax</span><span class="m-icon"><app-icon name="percent" [size]="15" /></span></div>
            <div class="value">{{ fmtINR(r.summary.igst + r.summary.cgst + r.summary.sgst + r.summary.cess, true) }}</div>
            <div class="sub">IGST {{ fmtINR(r.summary.igst, true) }} · CGST {{ fmtINR(r.summary.cgst, true) }} · SGST {{ fmtINR(r.summary.sgst, true) }}</div>
          </div>
          <div class="card metric warning">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Credit notes</span><span class="m-icon"><app-icon name="copy" [size]="15" /></span></div>
            <div class="value">{{ fmtINR(r.summary.creditNotes.value, true) }}</div>
            <div class="sub">{{ r.summary.creditNoteCount }} issued this period</div>
          </div>
          <div class="card metric success">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Net taxable</span><span class="m-icon"><app-icon name="checkCircle" [size]="15" /></span></div>
            <div class="value">{{ fmtINR(r.summary.netTaxable, true) }}</div>
            <!-- The figure that should tie to the books. -->
            <div class="sub">After credit notes — reconcile to this</div>
          </div>
        </section>

        <!-- One card per section, because that is how a return is filed and checked. -->
        <section class="card flush" style="margin-bottom:16px">
          <div class="card-head">
            <div>
              <div class="card-title">B2B — registered buyers</div>
              <div class="card-sub">Includes SEZ and deemed exports, flagged by invoice type</div>
            </div>
            <span class="pill">{{ b2bCount() }} invoice{{ b2bCount() === 1 ? '' : 's' }}</span>
          </div>
          @if (r.sections.b2b.length) {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead><tr><th>Buyer GSTIN</th><th>Buyer</th><th>Invoice</th><th>Date</th><th class="num">Value</th><th>POS</th><th>RCM</th><th>Type</th></tr></thead>
                <tbody>
                  @for (party of r.sections.b2b; track party.ctin) {
                    @for (inv of party.inv; track inv.inum) {
                      <tr>
                        <td class="mono" data-label="Buyer GSTIN" style="font-size:11px">{{ party.ctin }}</td>
                        <td data-label="Buyer">{{ party.cfs }}</td>
                        <td class="num" data-label="Invoice">{{ inv.inum }}</td>
                        <td class="muted" data-label="Date">{{ inv.idt }}</td>
                        <td class="num strong" data-label="Value">{{ fmtINR(inv.val) }}</td>
                        <td data-label="POS">{{ inv.pos }}</td>
                        <td data-label="RCM">{{ inv.rchrg }}</td>
                        <td data-label="Type"><span class="pill">{{ inv.inv_typ }}</span></td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state icon="◫" title="Nothing in B2B" message="No invoices to registered buyers this period." />
          }
        </section>

        <section class="grid grid-2" style="margin-bottom:16px">
          <div class="card flush">
            <div class="card-head">
              <div>
                <div class="card-title">B2CL</div>
                <div class="card-sub">Unregistered, inter-state, above {{ fmtINR(r.summary.b2clThreshold, true) }}</div>
              </div>
            </div>
            @if (r.sections.b2cl.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>POS</th><th>Invoice</th><th>Date</th><th class="num">Value</th></tr></thead>
                  <tbody>
                    @for (group of r.sections.b2cl; track group.pos) {
                      @for (inv of group.inv; track inv.inum) {
                        <tr>
                          <td>{{ group.pos }}</td>
                          <td class="num">{{ inv.inum }}</td>
                          <td class="muted">{{ inv.idt }}</td>
                          <td class="num strong">{{ fmtINR(inv.val) }}</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="◫" title="Nothing in B2CL" message="No large inter-state consumer sales." />
            }
          </div>

          <div class="card flush">
            <div class="card-head">
              <div>
                <div class="card-title">B2CS</div>
                <div class="card-sub">Everything else to consumers, aggregated by place of supply and rate</div>
              </div>
            </div>
            @if (r.sections.b2cs.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>Type</th><th>POS</th><th class="num">Rate</th><th class="num">Taxable</th><th class="num">Tax</th></tr></thead>
                  <tbody>
                    @for (row of r.sections.b2cs; track row.sply_ty + row.pos + row.rt) {
                      <tr>
                        <td>{{ row.sply_ty }}</td>
                        <td>{{ row.pos }}</td>
                        <td class="num">{{ row.rt }}%</td>
                        <td class="num">{{ fmtINR(row.txval) }}</td>
                        <td class="num">{{ fmtINR(row.iamt + row.camt + row.samt) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="◫" title="Nothing in B2CS" message="No consumer sales this period." />
            }
          </div>
        </section>

        <section class="grid grid-2" style="margin-bottom:16px">
          <div class="card flush">
            <div class="card-head"><div><div class="card-title">CDNR / CDNUR</div><div class="card-sub">Credit notes, against their original invoices</div></div></div>
            @if (r.sections.cdnr.length || r.sections.cdnur.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>Buyer</th><th>Credit note</th><th>Against</th><th class="num">Value</th></tr></thead>
                  <tbody>
                    @for (party of r.sections.cdnr; track party.ctin) {
                      @for (note of party.nt; track note.nt_num) {
                        <tr>
                          <td>{{ party.cfs }}<div class="muted mono" style="font-size:10px">{{ party.ctin }}</div></td>
                          <td class="num">{{ note.nt_num }}<div class="muted" style="font-size:10px">{{ note.nt_dt }}</div></td>
                          <td class="num">{{ note.inum }}</td>
                          <td class="num strong">{{ fmtINR(note.val) }}</td>
                        </tr>
                      }
                    }
                    @for (note of r.sections.cdnur; track note.nt_num) {
                      <tr>
                        <td><span class="pill">{{ note.typ }}</span> <span class="muted">unregistered</span></td>
                        <td class="num">{{ note.nt_num }}<div class="muted" style="font-size:10px">{{ note.nt_dt }}</div></td>
                        <td class="num">{{ note.inum }}</td>
                        <td class="num strong">{{ fmtINR(note.val) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="◫" title="No credit notes" message="Nothing was credited this period." />
            }
          </div>

          <div class="card flush">
            <div class="card-head"><div><div class="card-title">EXP — exports</div><div class="card-sub">With and without payment of IGST</div></div></div>
            @if (r.sections.exp.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>Type</th><th>Invoice</th><th class="num">Value</th><th>Shipping bill</th></tr></thead>
                  <tbody>
                    @for (group of r.sections.exp; track group.exp_typ) {
                      @for (inv of group.inv; track inv.inum) {
                        <tr>
                          <td><span class="pill">{{ group.exp_typ === 'WPAY' ? 'With payment' : 'Under LUT' }}</span></td>
                          <td class="num">{{ inv.inum }}<div class="muted" style="font-size:10px">{{ inv.idt }}</div></td>
                          <td class="num strong">{{ fmtINR(inv.val) }}</td>
                          <td class="mono" style="font-size:11px">{{ inv.sbnum || '—' }}</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="◫" title="No exports" message="No zero-rated supplies this period." />
            }
          </div>
        </section>

        <section class="grid grid-2">
          <div class="card flush">
            <div class="card-head"><div><div class="card-title">HSN / SAC summary</div><div class="card-sub">A required table in GSTR-1</div></div></div>
            @if (r.sections.hsn.length) {
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>HSN/SAC</th><th>Description</th><th class="num">Qty</th><th class="num">Taxable</th><th class="num">Tax</th></tr></thead>
                  <tbody>
                    @for (row of r.sections.hsn; track row.hsn_sc) {
                      <tr>
                        <td class="mono">{{ row.hsn_sc }}</td>
                        <td class="muted">{{ row.desc || '' }}</td>
                        <td class="num">{{ row.qty }}</td>
                        <td class="num">{{ fmtINR(row.txval) }}</td>
                        <td class="num">{{ fmtINR(row.iamt + row.camt + row.samt + row.csamt) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state icon="◫" title="No HSN data" message="Add HSN/SAC codes to your line items." />
            }
          </div>

          <div style="display:grid;gap:16px;align-content:start">
            <div class="card">
              <div class="card-title">Nil-rated, exempt &amp; non-GST</div>
              <div class="card-sub" style="margin-bottom:14px">Reported here only — never also in B2B or B2CS</div>
              <div class="grid grid-3" style="gap:10px">
                <div class="stat-block"><div class="sb-label">Exempt</div><div class="sb-value">{{ fmtINR(r.sections.nil.exempt, true) }}</div></div>
                <div class="stat-block"><div class="sb-label">Nil-rated</div><div class="sb-value">{{ fmtINR(r.sections.nil.nilRated, true) }}</div></div>
                <div class="stat-block"><div class="sb-label">Non-GST</div><div class="sb-value">{{ fmtINR(r.sections.nil.nonGst, true) }}</div></div>
              </div>
            </div>

            <div class="card flush">
              <div class="card-head"><div><div class="card-title">Documents issued</div><div class="card-sub">Series, with cancellations accounted for</div></div></div>
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>Series</th><th>From</th><th>To</th><th class="num">Total</th><th class="num">Cancelled</th><th class="num">Net</th></tr></thead>
                  <tbody>
                    @for (row of r.sections.docIssued; track row.prefix) {
                      <tr>
                        <td class="mono">{{ row.prefix }}</td>
                        <td class="num">{{ row.from }}</td>
                        <td class="num">{{ row.to }}</td>
                        <td class="num">{{ row.totnum }}</td>
                        <td class="num">{{ row.cancel }}</td>
                        <td class="num strong">{{ row.net_issue }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      }

      @if (tab() === 'gstr3b' && gstr3b(); as r) {
        <section class="grid grid-3" style="margin-bottom:20px">
          <div class="card metric danger">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Output liability</span><span class="m-icon"><app-icon name="rupee" [size]="15" /></span></div>
            <div class="value">{{ fmtINR(liability(r), true) }}</div>
            <div class="sub">Including reverse-charge inward supplies</div>
          </div>
          <div class="card metric success">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">ITC available</span><span class="m-icon"><app-icon name="checkCircle" [size]="15" /></span></div>
            <div class="value">{{ fmtINR(itcTotal(r), true) }}</div>
            <div class="sub">From recorded purchases</div>
          </div>
          <div class="card metric indigo">
            <div class="accent"></div>
            <div class="metric-row"><span class="label">Payable in cash</span><span class="m-icon"><app-icon name="creditCard" [size]="15" /></span></div>
            <div class="value">{{ fmtINR(r.netPayable.totalCash, true) }}</div>
            <!-- The number that was uncomputable before purchases existed. -->
            <div class="sub">Liability less credit, head by head</div>
          </div>
        </section>

        <section class="card flush" style="margin-bottom:16px">
          <div class="card-head">
            <div>
              <div class="card-title">Set-off by tax head</div>
              <div class="card-sub">
                Credit under one head cannot be applied to another arbitrarily, so a surplus is
                carried forward rather than reducing another head's cash
              </div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Head</th><th class="num">Liability</th><th class="num">ITC</th><th class="num">Payable</th><th class="num">Carry forward</th></tr></thead>
              <tbody>
                @for (head of heads; track head) {
                  <tr>
                    <td class="strong">{{ head.toUpperCase() }}</td>
                    <td class="num">{{ fmtINR(r.netPayable[head].liability) }}</td>
                    <td class="num">{{ fmtINR(r.netPayable[head].itc) }}</td>
                    <td class="num strong">{{ fmtINR(r.netPayable[head].payable) }}</td>
                    <td class="num muted">{{ fmtINR(r.netPayable[head].carryForward) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="grid grid-2">
          <div class="card">
            <div class="card-title">3.1 — Outward supplies</div>
            <div class="card-sub" style="margin-bottom:14px">And inward supplies liable to reverse charge</div>
            <div style="display:grid;gap:10px">
              <div class="stat-block"><div class="sb-label">(a) Taxable</div><div class="sb-value">{{ fmtINR(r.outward.taxable.taxable, true) }} · tax {{ fmtINR(blockTax(r.outward.taxable), true) }}</div></div>
              <div class="stat-block"><div class="sb-label">(b) Zero-rated</div><div class="sb-value">{{ fmtINR(r.outward.zeroRated.taxable, true) }}</div></div>
              <div class="stat-block"><div class="sb-label">(c) Nil-rated / exempt</div><div class="sb-value">{{ fmtINR(r.outward.nilExempt.taxable, true) }}</div></div>
              <div class="stat-block"><div class="sb-label">(d) Inward under reverse charge</div><div class="sb-value">{{ fmtINR(r.outward.inwardReverseCharge.taxable, true) }} · tax {{ fmtINR(blockTax(r.outward.inwardReverseCharge), true) }}</div></div>
              <div class="stat-block"><div class="sb-label">Less credit notes</div><div class="sb-value">{{ fmtINR(r.outward.creditNotes.taxable, true) }}</div></div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">4 — Input tax credit</div>
            <div class="card-sub" style="margin-bottom:14px">A reverse-charge purchase appears here and in 3.1(d) — both lines are filed</div>
            <div style="display:grid;gap:10px">
              <div class="stat-block"><div class="sb-label">Import of goods</div><div class="sb-value">{{ fmtINR(blockTax(r.itc.importGoods), true) }}</div></div>
              <div class="stat-block"><div class="sb-label">Import of services</div><div class="sb-value">{{ fmtINR(blockTax(r.itc.importServices), true) }}</div></div>
              <div class="stat-block"><div class="sb-label">Inward reverse charge</div><div class="sb-value">{{ fmtINR(blockTax(r.itc.inwardReverseCharge), true) }}</div></div>
              <div class="stat-block"><div class="sb-label">All other ITC</div><div class="sb-value">{{ fmtINR(blockTax(r.itc.other), true) }}</div></div>
              <div class="stat-block"><div class="sb-label">Ineligible (recorded, not claimed)</div><div class="sb-value">{{ fmtINR(blockTax(r.itc.ineligible), true) }}</div></div>
            </div>
          </div>
        </section>
      }

      @if (tab() === 'itc' && itc(); as r) {
        <section class="grid grid-4" style="margin-bottom:20px">
          <div class="stat-block"><div class="sb-label">Claimable IGST</div><div class="sb-value">{{ fmtINR(r.claimable.igst, true) }}</div></div>
          <div class="stat-block"><div class="sb-label">Claimable CGST</div><div class="sb-value">{{ fmtINR(r.claimable.cgst, true) }}</div></div>
          <div class="stat-block"><div class="sb-label">Claimable SGST</div><div class="sb-value">{{ fmtINR(r.claimable.sgst, true) }}</div></div>
          <div class="stat-block"><div class="sb-label">Not claimable</div><div class="sb-value">{{ fmtINR(r.ineligible, true) }}</div></div>
        </section>

        <section class="card flush">
          <div class="card-head">
            <div>
              <div class="card-title">By category</div>
              <div class="card-sub">
                Capital goods and input services are reported on their own lines;
                blocked credits are recorded but never claimed
              </div>
            </div>
          </div>
          @if (r.byCategory.length) {
            <div class="table-wrap">
              <table class="table stack-mobile">
                <thead><tr><th>Category</th><th class="num">Purchases</th><th class="num">Taxable</th><th class="num">Tax paid</th><th class="num">Claimable</th><th>Status</th></tr></thead>
                <tbody>
                  @for (row of r.byCategory; track row.category) {
                    <tr>
                      <td class="strong" data-label="Category">{{ categoryLabel(row.category) }}</td>
                      <td class="num" data-label="Purchases">{{ row.purchases }}</td>
                      <td class="num" data-label="Taxable">{{ fmtINR(row.taxableValue) }}</td>
                      <td class="num" data-label="Tax paid">{{ fmtINR(row.taxPaid) }}</td>
                      <td class="num strong" data-label="Claimable">{{ fmtINR(row.total) }}</td>
                      <td data-label="Status">
                        <span class="pill" [class.danger]="!row.eligible">{{ row.eligible ? 'Eligible' : 'Not claimable' }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state icon="◫" title="No purchases in this period"
              message="Record purchase invoices to build up input tax credit." />
          }
        </section>
      }
    </app-shell>
  `
})
export class GstReturnsComponent implements OnInit {
  tab = signal<Tab>('gstr1');
  loading = signal(true);
  downloading = signal(false);

  gstr1 = signal<Gstr1Report | null>(null);
  gstr3b = signal<Gstr3bReport | null>(null);
  itc = signal<ItcRegister | null>(null);

  /** Defaults to the last complete month — the one someone sitting down to file is filing. */
  month = signal(this.previousMonth());
  heads: Array<'igst' | 'cgst' | 'sgst' | 'cess'> = ['igst', 'cgst', 'sgst', 'cess'];

  fmtINR = fmtINR;

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() { this.loadGstr1(); }

  private previousMonth(): string {
    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
  }

  private params() { return { month: this.month() }; }

  onMonth(month: string) {
    this.month.set(month);
    // Everything already loaded is now stale, so drop it rather than showing last
    // month's figures under this month's heading.
    this.gstr1.set(null);
    this.gstr3b.set(null);
    this.itc.set(null);
    if (this.tab() === 'gstr1') this.loadGstr1();
    if (this.tab() === 'gstr3b') this.loadGstr3b();
    if (this.tab() === 'itc') this.loadItc();
  }

  onGstr3bTab() {
    this.tab.set('gstr3b');
    if (!this.gstr3b()) this.loadGstr3b();
  }

  onItcTab() {
    this.tab.set('itc');
    if (!this.itc()) this.loadItc();
  }

  loadGstr1() {
    this.loading.set(true);
    this.api.gstr1(this.params()).subscribe({
      next: report => { this.gstr1.set(report); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  loadGstr3b() {
    this.loading.set(true);
    this.api.gstr3b(this.params()).subscribe({
      next: report => { this.gstr3b.set(report); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  loadItc() {
    this.loading.set(true);
    const [year, month] = this.month().split('-').map(Number);
    const from = `${this.month()}-01`;
    // Day 0 of the next month is the last day of this one, which avoids hardcoding
    // month lengths or getting February wrong.
    const to = new Date(year, month, 0).toISOString().slice(0, 10);
    this.api.itcRegister({ from, to }).subscribe({
      next: report => { this.itc.set(report); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  b2bCount = computed(() =>
    (this.gstr1()?.sections.b2b || []).reduce((total, party) => total + party.inv.length, 0));

  blockTax(block: { igst: number; cgst: number; sgst: number; cess: number }): number {
    return block.igst + block.cgst + block.sgst + block.cess;
  }

  liability(report: Gstr3bReport): number {
    return this.heads.reduce((total, head) => total + report.netPayable[head].liability, 0);
  }

  itcTotal(report: Gstr3bReport): number {
    return this.heads.reduce((total, head) => total + report.netPayable[head].itc, 0);
  }

  categoryLabel(category: string): string {
    const labels: Record<string, string> = {
      inputs: 'Inputs',
      'capital-goods': 'Capital goods',
      'input-services': 'Input services',
      ineligible: 'Ineligible',
      blocked: 'Blocked — s.17(5)'
    };
    return labels[category] || category;
  }

  downloadJson() {
    this.downloading.set(true);
    this.api.downloadGstr1Json(this.params()).subscribe({
      next: blob => {
        this.downloading.set(false);
        downloadBlob(blob, `GSTR1-${this.month()}.json`);
        this.toast.success('Upload this file to the GSTN offline utility');
      },
      error: err => { this.downloading.set(false); this.toast.httpError(err); }
    });
  }

  downloadCsv() {
    this.downloading.set(true);
    this.api.downloadGstr1Csv(this.params()).subscribe({
      next: blob => { this.downloading.set(false); downloadBlob(blob, `GSTR1-${this.month()}.csv`); },
      error: err => { this.downloading.set(false); this.toast.httpError(err); }
    });
  }
}
