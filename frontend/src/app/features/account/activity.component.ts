import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { IconComponent } from '../../shared/icons';
import { EmptyStateComponent, PagerComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ServerList } from '../../core/server-list';
import { TenantActivityEntry } from '../../core/models';
import { fmtDate } from '../../core/format';

/**
 * The organisation's own activity log (2.6 #50).
 *
 * `AuditLog` has recorded `orgId` since Phase 1 and was only ever exposed on the
 * *superadmin* route — so a tenant admin could not see who on their own team changed
 * what, which is the first question anyone asks after a mistake. The data was always
 * there; only the door was missing.
 *
 * Support access is shown here in plain words rather than hidden. If somebody at
 * KloguBizz acted inside this account, the customer sees that it happened — which is
 * the visible half of the platform's data-access log, and the thing that makes
 * impersonation defensible rather than merely audited internally.
 */
@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, IconComponent, EmptyStateComponent, PagerComponent, SkeletonRowsComponent],
  template: `
    <app-shell title="Activity Log" subtitle="Every recorded change in your organisation, and who made it">
      <div class="card" style="margin-bottom:16px">
        <div class="grid grid-4">
          <div class="field">
            <label>Action starts with</label>
            <input [ngModel]="list.filters()['action']" (ngModelChange)="list.setFilter('action', $event)" placeholder="invoice.">
          </div>
          <div class="field">
            <label>Record type</label>
            <select [ngModel]="list.filters()['entity']" (ngModelChange)="list.setFilter('entity', $event)">
              <option value="">Anything</option>
              @for (entity of entities; track entity) { <option [value]="entity">{{ entity }}</option> }
            </select>
          </div>
          <div class="field"><label>From</label><input type="date" [ngModel]="list.filters()['from']" (ngModelChange)="list.setFilter('from', $event)"></div>
          <div class="field"><label>To</label><input type="date" [ngModel]="list.filters()['to']" (ngModelChange)="list.setFilter('to', $event)"></div>
        </div>
      </div>

      <div class="card flush">
        @if (list.loading()) {
          <app-skeleton-rows [count]="6" />
        } @else if (!list.rows().length) {
          <app-empty-state icon="◷" title="Nothing recorded yet"
            message="Changes to invoices, clients, items and settings appear here as they happen." />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead><tr><th>When</th><th>What happened</th><th>Who</th><th>Details</th></tr></thead>
              <tbody>
                @for (entry of list.rows(); track entry._id) {
                  <tr>
                    <td class="muted" data-label="When" style="white-space:nowrap">{{ fmtDate(entry.createdAt) }}</td>
                    <td data-label="What happened">
                      <div class="strong">{{ humanise(entry.action) }}</div>
                      @if (entry.entity) { <div class="muted" style="font-size:11px">{{ entry.entity }}</div> }
                    </td>
                    <td data-label="Who">
                      {{ entry.actorName || 'System' }}
                      @if (entry.bySupport) {
                        <!-- Named rather than hidden: the customer is entitled to know
                             when support acted inside their account. -->
                        <div><span class="pill danger" style="margin-top:3px">{{ entry.bySupport }}</span></div>
                      }
                    </td>
                    <td class="muted" data-label="Details" style="font-size:11px;max-width:320px;word-break:break-word">
                      {{ summarise(entry) }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pager [page]="list.page()" [pageSize]="list.pageSize()" [total]="list.total()"
            (pageChange)="list.onPage($event)" (pageSizeChange)="list.onPageSize($event)" />
        }
      </div>

      <div class="info-box" style="margin-top:16px;display:flex;gap:8px;align-items:flex-start">
        <app-icon name="lock" [size]="15" style="flex-shrink:0;margin-top:1px" />
        <span>
          This log is append-only — entries cannot be edited or removed, including by us.
        </span>
      </div>
    </app-shell>
  `
})
export class ActivityComponent implements OnInit, OnDestroy {
  list = new ServerList<TenantActivityEntry>(params => this.api.tenantActivity(params));
  entities = ['invoice', 'payment', 'creditNote', 'client', 'item', 'vendor', 'purchase', 'user', 'organisation'];
  fmtDate = fmtDate;

  constructor(private api: ApiService) {}

  ngOnInit() { this.list.refresh(); }
  ngOnDestroy() { this.list.dispose(); }

  /** `invoice.created` → "Invoice created". The action names are for machines. */
  humanise(action: string): string {
    const text = (action || '').replace(/[._]/g, ' ').trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /** `meta` has no fixed shape by design, so this is a tolerant one-liner. */
  summarise(entry: TenantActivityEntry): string {
    if (!entry.meta || typeof entry.meta !== 'object') return '';
    return Object.entries(entry.meta)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join(' · ')
      .slice(0, 200);
  }
}
