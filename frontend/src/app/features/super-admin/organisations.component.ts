import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent, OverflowMenuComponent } from '../../shared/ui';
import { IconComponent } from '../../shared/icons';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { OrgSummary, Plan, SuperOverview } from '../../core/models';
import { fmtINR, fmtDate, isValidEmail, stateName, STATES } from '../../core/format';

interface OrgAddForm {
  name: string; gstin: string; adminName: string; adminEmail: string;
  phone: string; stateCode: string; address: string; plan: string;
}

interface OrgEditForm {
  name: string; gstin: string; phone: string; stateCode: string;
  address: string; plan: string; status: string;
}

@Component({
  selector: 'app-super-organisations',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent, IconComponent, PagerComponent, OverflowMenuComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Organizations</h1>
        <p>{{ overview()?.organisations || 0 }} registered organizations · {{ overview()?.active || 0 }} active</p>
      </div>
      <div class="page-actions">
        <button class="btn primary" type="button" (click)="openAdd()">+ Add Organization</button>
      </div>
    </div>

    <section class="grid grid-5" style="margin-bottom:20px">
      <div class="card metric indigo">
        <div class="accent"></div>
        <div class="metric-row"><span class="label">Total Orgs</span><span class="m-icon"><app-icon name="package" [size]="15" /></span></div>
        <div class="value">{{ overview()?.organisations || 0 }}</div>
      </div>
      <div class="card metric success">
        <div class="accent"></div>
        <div class="metric-row"><span class="label">Active</span><span class="m-icon"><app-icon name="checkCircle" [size]="15" /></span></div>
        <div class="value">{{ overview()?.active || 0 }}</div>
      </div>
      <div class="card metric warning">
        <div class="accent"></div>
        <div class="metric-row"><span class="label">Trial</span><span class="m-icon"><app-icon name="clock" [size]="15" /></span></div>
        <div class="value">{{ overview()?.trial || 0 }}</div>
      </div>
      <div class="card metric danger">
        <div class="accent"></div>
        <div class="metric-row"><span class="label">Suspended</span><span class="m-icon"><app-icon name="ban" [size]="15" /></span></div>
        <div class="value">{{ overview()?.suspended || 0 }}</div>
      </div>
      <div class="card metric purple">
        <div class="accent"></div>
        <div class="metric-row"><span class="label">Platform Revenue</span><span class="m-icon"><app-icon name="rupee" [size]="15" /></span></div>
        <div class="value">{{ fmtINR(overview()?.totalRevenue || 0, true) }}</div>
      </div>
    </section>

    <div class="toolbar">
      <div class="tabs">
        <button type="button" [class.active]="tab() === 'all'" (click)="onTab('all')">All ({{ orgs().length }})</button>
        <button type="button" [class.active]="tab() === 'active'" (click)="onTab('active')">Active ({{ countOf('active') }})</button>
        <button type="button" [class.active]="tab() === 'trial'" (click)="onTab('trial')">Trial ({{ countOf('trial') }})</button>
        <button type="button" [class.active]="tab() === 'suspended'" (click)="onTab('suspended')">Suspended ({{ countOf('suspended') }})</button>
      </div>
      <div class="search-box">
        <span class="search-icon">⌕</span>
        <input class="input" placeholder="Search name, email or GSTIN" [ngModel]="search()" (ngModelChange)="onSearch($event)">
      </div>
    </div>

    <div class="card flush">
      @if (loading()) {
        <app-skeleton-rows [count]="5" />
      } @else if (!filtered().length) {
        <app-empty-state icon="🏢" title="No organizations found" message="Try a different filter or add a new organization." />
      } @else {
        <div class="table-wrap">
          <table class="table stack-mobile">
            <thead>
              <tr>
                <th>Organization</th><th>Owner</th><th>Plan</th><th>Users</th><th>Invoices</th><th>Created</th><th>Status</th><th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (o of paged(); track o._id) {
                <tr>
                  <td data-label="Organization">
                    <div style="display:flex;align-items:center;gap:10px">
                      <app-avatar [name]="o.name" [size]="32" />
                      <div>
                        <div class="strong">{{ o.name }}</div>
                        <div class="muted mono" style="font-size:11px">{{ o.gstin || '—' }}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Owner">
                    <div>{{ o.owner?.name || '—' }}</div>
                    <div class="muted" style="font-size:11px">{{ o.owner?.email || o.adminEmail }}</div>
                  </td>
                  <td data-label="Plan" data-priority="high"><span [class]="'pill ' + planClass(o.plan)">{{ planLabel(o.plan) }}</span></td>
                  <td class="num" data-label="Users">{{ o.userCount }}</td>
                  <td class="num" data-label="Invoices">{{ o.invoiceCount }}</td>
                  <td class="muted" data-label="Created">{{ fmtDate(o.createdAt) }}</td>
                  <td data-label="Status" data-priority="high"><app-pill [status]="o.status" /></td>
                  <td data-label="">
                    <div class="actions">
                      <button class="btn ghost sm" type="button" (click)="openView(o)">View</button>
                      <button class="btn secondary sm" type="button" (click)="openEdit(o)">Edit</button>
                      <app-overflow-menu>
                        @if (o.status !== 'suspended') {
                          <button class="btn danger sm" type="button" (click)="askStatus(o, 'suspend')">Suspend</button>
                        } @else {
                          <button class="btn success sm" type="button" (click)="askStatus(o, 'activate')">Activate</button>
                        }
                        <button class="btn danger sm" type="button" (click)="askDelete(o)"><app-icon name="trash" [size]="13" /> Delete</button>
                      </app-overflow-menu>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [page]="page()" [pageSize]="pageSize()" [total]="filtered().length"
          (pageChange)="page.set($event)" (pageSizeChange)="onPageSize($event)" />
      }
    </div>

    <!-- Add organization -->
    <app-modal [open]="showAdd()" title="Add Organization" [width]="580" (close)="showAdd.set(false)">
      <div class="form-section">
        <div class="form-section-title">Organization Details</div>
        <div class="grid grid-2">
          <div class="field">
            <label>Organization Name *</label>
            <input [(ngModel)]="addForm.name" placeholder="Acme Traders Pvt Ltd">
          </div>
          <div class="field">
            <label>GSTIN</label>
            <input class="mono" [(ngModel)]="addForm.gstin" placeholder="27AAAAA0000A1Z5">
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Admin Contact</div>
        <div class="grid grid-2">
          <div class="field">
            <label>Admin Name</label>
            <input [(ngModel)]="addForm.adminName" placeholder="Full name">
          </div>
          <div class="field">
            <label>Admin Email *</label>
            <input type="email" [(ngModel)]="addForm.adminEmail" placeholder="admin@company.com">
            @if (addForm.adminEmail && !isValidEmail(addForm.adminEmail)) { <div class="error">Enter a valid email address</div> }
          </div>
        </div>
        <div class="field">
          <label>Phone</label>
          <input [(ngModel)]="addForm.phone" placeholder="+91 98xxxxxx00">
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Location &amp; Plan</div>
        <div class="grid grid-2">
          <div class="field">
            <label>State</label>
            <select [(ngModel)]="addForm.stateCode">
              <option value="">Select state</option>
              @for (s of states; track s.code) { <option [value]="s.code">{{ s.name }} ({{ s.code }})</option> }
            </select>
          </div>
          <div class="field">
            <label>Plan</label>
            <select [(ngModel)]="addForm.plan">
              @for (p of planOptions(); track p.code) { <option [value]="p.code">{{ p.name }}</option> }
            </select>
          </div>
        </div>
        <div class="field">
          <label>Address</label>
          <input [(ngModel)]="addForm.address" placeholder="Registered address">
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn ghost" type="button" (click)="showAdd.set(false)">Cancel</button>
        <button class="btn primary" type="button" [disabled]="saving() || !canCreate()" (click)="create()">
          @if (saving()) { <span class="spinner"></span> } Create Organization
        </button>
      </div>
    </app-modal>

    <!-- Credentials follow-up -->
    <app-modal [open]="showCreds()" title="Organization Created" [width]="480" (close)="showCreds.set(false)">
      <div class="info-box ok" style="margin-bottom:14px;display:flex;gap:8px;align-items:flex-start">
        <app-icon name="checkCircle" [size]="15" style="flex-shrink:0;margin-top:1px" />
        <span>Organization created. Share these credentials securely with the admin.</span>
      </div>
      <div class="grid grid-2" style="gap:10px">
        <div class="stat-block">
          <div class="sb-label">Login Email</div>
          <div class="sb-value mono">{{ credEmail() }}</div>
        </div>
        <div class="stat-block">
          <div class="sb-label">Temporary Password</div>
          <div class="sb-value mono">{{ credPassword() }}</div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn primary" type="button" (click)="showCreds.set(false)">Done</button>
      </div>
    </app-modal>

    <!-- Edit organization -->
    <app-modal [open]="showEdit()" title="Edit Organization" [width]="580" (close)="showEdit.set(false)">
      <div class="form-section">
        <div class="form-section-title">Organization Details</div>
        <div class="grid grid-2">
          <div class="field">
            <label>Organization Name</label>
            <input [(ngModel)]="editForm.name">
          </div>
          <div class="field">
            <label>GSTIN</label>
            <input class="mono" [(ngModel)]="editForm.gstin">
          </div>
        </div>
        <div class="field">
          <label>Phone</label>
          <input [(ngModel)]="editForm.phone">
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Location</div>
        <div class="grid grid-2">
          <div class="field">
            <label>State</label>
            <select [(ngModel)]="editForm.stateCode">
              <option value="">Select state</option>
              @for (s of states; track s.code) { <option [value]="s.code">{{ s.name }} ({{ s.code }})</option> }
            </select>
          </div>
          <div class="field">
            <label>Address</label>
            <input [(ngModel)]="editForm.address">
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Plan &amp; Status</div>
        <div class="grid grid-2">
          <div class="field">
            <label>Plan</label>
            <select [(ngModel)]="editForm.plan">
              @for (p of planOptions(); track p.code) { <option [value]="p.code">{{ p.name }}</option> }
            </select>
          </div>
          <div class="field">
            <label>Status</label>
            <select [(ngModel)]="editForm.status">
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn ghost" type="button" (click)="showEdit.set(false)">Cancel</button>
        <button class="btn primary" type="button" [disabled]="saving() || !editForm.name.trim()" (click)="saveEdit()">
          @if (saving()) { <span class="spinner"></span> } Save Changes
        </button>
      </div>
    </app-modal>

    <!-- View organization -->
    <app-modal [open]="showView()" title="Organization Details" [width]="520" (close)="showView.set(false)">
      @if (viewOrg(); as o) {
        <div style="background:var(--brand-pale);border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <app-avatar [name]="o.name" [size]="52" />
          <div style="min-width:0">
            <div style="font-weight:800;font-size:16px">{{ o.name }}</div>
            <div class="mono" style="font-size:11px;color:var(--text-mid)">{{ o.gstin || 'No GSTIN' }}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">{{ o.address || '—' }}</div>
          </div>
        </div>
        <div class="grid grid-2" style="gap:10px">
          <div class="stat-block">
            <div class="sb-label">Owner</div>
            <div class="sb-value">{{ o.owner?.name || '—' }}</div>
          </div>
          <div class="stat-block">
            <div class="sb-label">Email</div>
            <div class="sb-value" style="overflow:hidden;text-overflow:ellipsis">{{ o.owner?.email || o.adminEmail }}</div>
          </div>
          <div class="stat-block">
            <div class="sb-label">Phone</div>
            <div class="sb-value">{{ o.phone || '—' }}</div>
          </div>
          <div class="stat-block">
            <div class="sb-label">Plan</div>
            <div class="sb-value">{{ planLabel(o.plan) }}</div>
          </div>
          <div class="stat-block">
            <div class="sb-label">Users</div>
            <div class="sb-value">{{ o.userCount }}</div>
          </div>
          <div class="stat-block">
            <div class="sb-label">Invoices</div>
            <div class="sb-value">{{ o.invoiceCount }}</div>
          </div>
          <div class="stat-block">
            <div class="sb-label">Joined</div>
            <div class="sb-value">{{ fmtDate(o.createdAt) }}</div>
          </div>
          <div class="stat-block">
            <div class="sb-label">Status</div>
            <div style="margin-top:4px"><app-pill [status]="o.status" /></div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="showView.set(false)">Close</button>
        </div>
      }
    </app-modal>

    <!-- Suspend / Activate confirm -->
    <app-modal [open]="!!statusTarget()" [title]="statusAction() === 'suspend' ? 'Suspend Organization' : 'Activate Organization'" (close)="statusTarget.set(null)">
      @if (statusTarget(); as o) {
        @if (statusAction() === 'suspend') {
          <p style="margin:0 0 6px">Suspend <strong>{{ o.name }}</strong>? Their users will lose access until the organization is reactivated.</p>
        } @else {
          <p style="margin:0 0 6px">Activate <strong>{{ o.name }}</strong>? Their users will regain full access.</p>
        }
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="statusTarget.set(null)">Cancel</button>
          @if (statusAction() === 'suspend') {
            <button class="btn danger solid" type="button" [disabled]="saving()" (click)="confirmStatus()">Suspend</button>
          } @else {
            <button class="btn success" type="button" [disabled]="saving()" (click)="confirmStatus()">Activate</button>
          }
        </div>
      }
    </app-modal>

    <!-- Delete confirm -->
    <app-modal [open]="!!deleteTarget()" title="Delete Organization" (close)="deleteTarget.set(null)">
      @if (deleteTarget(); as o) {
        <div class="info-box danger" style="margin-bottom:12px;display:flex;gap:8px;align-items:flex-start">
          <app-icon name="alertTriangle" [size]="15" style="flex-shrink:0;margin-top:1px" />
          <span><strong>Permanent deletion</strong> — All data, invoices, and user accounts for this organization will be permanently deleted.</span>
        </div>
        <p style="margin:0">Are you sure you want to delete <strong>{{ o.name }}</strong>?</p>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="deleteTarget.set(null)">Cancel</button>
          <button class="btn danger solid" type="button" [disabled]="saving()" (click)="confirmDelete()">Delete Permanently</button>
        </div>
      }
    </app-modal>
  `
})
export class SuperOrganisationsComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  overview = signal<SuperOverview | null>(null);
  orgs = signal<OrgSummary[]>([]);
  plans = signal<Plan[]>([]);

  tab = signal<'all' | 'active' | 'trial' | 'suspended'>('all');
  search = signal('');

  showAdd = signal(false);
  showEdit = signal(false);
  showView = signal(false);
  showCreds = signal(false);
  viewOrg = signal<OrgSummary | null>(null);
  statusTarget = signal<OrgSummary | null>(null);
  statusAction = signal<'suspend' | 'activate'>('suspend');
  deleteTarget = signal<OrgSummary | null>(null);
  credEmail = signal('');
  credPassword = signal('');

  addForm: OrgAddForm = this.blankAddForm();
  editForm: OrgEditForm = { name: '', gstin: '', phone: '', stateCode: '', address: '', plan: 'starter', status: 'active' };
  private editId = '';

  states = STATES;
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  isValidEmail = isValidEmail;

  filtered = computed(() => {
    const t = this.tab();
    const q = this.search().trim().toLowerCase();
    return this.orgs().filter(o => {
      if (t !== 'all' && o.status !== t) return false;
      if (!q) return true;
      return o.name.toLowerCase().includes(q)
        || (o.adminEmail || '').toLowerCase().includes(q)
        || (o.owner?.email || '').toLowerCase().includes(q)
        || (o.gstin || '').toLowerCase().includes(q);
    });
  });

  page = signal(1);
  pageSize = signal(10);

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  planOptions = computed<Array<{ code: string; name: string }>>(() => {
    const loaded = this.plans();
    if (loaded.length) return loaded.map(p => ({ code: p.code, name: p.name }));
    return [
      { code: 'starter', name: 'Starter' },
      { code: 'growth', name: 'Growth' },
      { code: 'business', name: 'Business' },
      { code: 'enterprise', name: 'Enterprise' }
    ];
  });

  constructor(private api: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.load();
    this.api.superPlans().subscribe({ next: p => this.plans.set(p), error: () => {} });
  }

  load() {
    this.loading.set(true);
    forkJoin({ overview: this.api.superOverview(), orgs: this.api.superOrganisations() }).subscribe({
      next: res => {
        this.overview.set(res.overview);
        this.orgs.set(res.orgs);
        this.loading.set(false);
      },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  countOf(status: string): number {
    return this.orgs().filter(o => o.status === status).length;
  }

  onSearch(v: string) { this.search.set(v); this.page.set(1); }
  onTab(t: 'all' | 'active' | 'trial' | 'suspended') { this.tab.set(t); this.page.set(1); }
  onPageSize(v: number) { this.pageSize.set(v); this.page.set(1); }

  planClass(plan: string): string {
    const map: Record<string, string> = { starter: 'partial', growth: '', business: 'purple', enterprise: 'draft' };
    return map[plan] ?? '';
  }

  planLabel(plan: string): string {
    const found = this.plans().find(p => p.code === plan);
    if (found) return found.name;
    return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : '—';
  }

  private blankAddForm(): OrgAddForm {
    return { name: '', gstin: '', adminName: '', adminEmail: '', phone: '', stateCode: '', address: '', plan: 'starter' };
  }

  openAdd() {
    this.addForm = this.blankAddForm();
    this.showAdd.set(true);
  }

  canCreate(): boolean {
    return !!this.addForm.name.trim() && isValidEmail(this.addForm.adminEmail);
  }

  create() {
    if (!this.canCreate()) return;
    this.saving.set(true);
    const f = this.addForm;
    const payload: Record<string, unknown> = {
      name: f.name.trim(),
      gstin: f.gstin.trim().toUpperCase(),
      adminName: f.adminName.trim(),
      adminEmail: f.adminEmail.trim().toLowerCase(),
      phone: f.phone.trim(),
      stateCode: f.stateCode,
      state: f.stateCode ? stateName(f.stateCode) : '',
      address: f.address.trim(),
      plan: f.plan
    };
    this.api.superCreateOrganisation(payload).subscribe({
      next: res => {
        this.saving.set(false);
        this.showAdd.set(false);
        this.credEmail.set(res.admin?.email || f.adminEmail.trim().toLowerCase());
        this.credPassword.set(res.tempPassword);
        this.showCreds.set(true);
        this.toast.success('Organization created');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  openEdit(o: OrgSummary) {
    this.editId = o._id;
    this.editForm = {
      name: o.name,
      gstin: o.gstin || '',
      phone: o.phone || '',
      stateCode: o.stateCode || '',
      address: o.address || '',
      plan: o.plan,
      status: o.status
    };
    this.showEdit.set(true);
  }

  saveEdit() {
    if (!this.editForm.name.trim()) return;
    this.saving.set(true);
    const f = this.editForm;
    this.api.superUpdateOrganisation(this.editId, {
      name: f.name.trim(),
      gstin: f.gstin.trim().toUpperCase(),
      phone: f.phone.trim(),
      stateCode: f.stateCode,
      state: f.stateCode ? stateName(f.stateCode) : '',
      address: f.address.trim(),
      plan: f.plan,
      status: f.status
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showEdit.set(false);
        this.toast.success('Organization updated');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  openView(o: OrgSummary) {
    this.viewOrg.set(o);
    this.showView.set(true);
  }

  askStatus(o: OrgSummary, action: 'suspend' | 'activate') {
    this.statusAction.set(action);
    this.statusTarget.set(o);
  }

  confirmStatus() {
    const o = this.statusTarget();
    if (!o) return;
    const next = this.statusAction() === 'suspend' ? 'suspended' : 'active';
    this.saving.set(true);
    this.api.superUpdateOrganisation(o._id, { status: next }).subscribe({
      next: () => {
        this.saving.set(false);
        this.statusTarget.set(null);
        this.toast.success(next === 'suspended' ? o.name + ' suspended' : o.name + ' activated');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  askDelete(o: OrgSummary) {
    this.deleteTarget.set(o);
  }

  confirmDelete() {
    const o = this.deleteTarget();
    if (!o) return;
    this.saving.set(true);
    this.api.superDeleteOrganisation(o._id).subscribe({
      next: () => {
        this.saving.set(false);
        this.deleteTarget.set(null);
        this.toast.info('Organization deleted');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }
}
