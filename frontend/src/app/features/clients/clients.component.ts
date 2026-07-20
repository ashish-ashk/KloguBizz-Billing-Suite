import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { AvatarComponent, EmptyStateComponent, ModalComponent, PagerComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Client } from '../../core/models';
import { STATES, isValidEmail, isValidGSTIN, stateName } from '../../core/format';

interface ClientForm {
  companyName: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  stateCode: string;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShellComponent, ModalComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent],
  template: `
    <app-shell title="Clients" [subtitle]="clients().length + ' clients on file'">
      <button actions class="btn primary" type="button" (click)="openAdd()">+ Add Client</button>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">⌕</span>
          <input class="input" type="text" placeholder="Search name, GSTIN or email"
            [ngModel]="search()" (ngModelChange)="onSearch($event)">
        </div>
      </div>

      <div class="card flush">
        @if (loading()) {
          <app-skeleton-rows [count]="5" />
        } @else if (clients().length === 0) {
          <app-empty-state icon="◫" title="No clients yet" message="Add your first client to start invoicing." />
        } @else if (filtered().length === 0) {
          <app-empty-state icon="⌕" title="No matching clients" message="Try a different search term." />
        } @else {
          <div class="table-wrap">
            <table class="table stack-mobile">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>GSTIN</th>
                  <th>Phone</th>
                  <th>State</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (c of paged(); track c._id) {
                  <tr>
                    <td data-label="Client">
                      <div style="display:flex;align-items:center;gap:10px">
                        <app-avatar [name]="c.companyName" [size]="32" />
                        <div>
                          <div class="strong">{{ c.companyName }}</div>
                          <div class="muted" style="font-size:11.5px">{{ c.email || '—' }}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="GSTIN">
                      @if (c.gstin) { <span class="mono">{{ c.gstin }}</span> }
                      @else { <span class="muted">—</span> }
                    </td>
                    <td data-label="Phone">{{ c.phone || '—' }}</td>
                    <td data-label="State">{{ stateName(c.stateCode) }} <span class="muted">({{ c.stateCode }})</span></td>
                    <td data-label="">
                      <div class="actions">
                        <button class="btn ghost sm" type="button" (click)="openEdit(c)">Edit</button>
                        <button class="btn danger sm" type="button" (click)="deleteTarget.set(c)">Delete</button>
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

      <!-- Add / Edit modal -->
      <app-modal [open]="modalOpen()" [title]="editing() ? 'Edit Client' : 'Add Client'" (close)="modalOpen.set(false)">
        <form class="form" (ngSubmit)="save()">
          <div class="field">
            <label>Company Name *</label>
            <input name="companyName" [(ngModel)]="form.companyName" placeholder="Acme Traders Pvt Ltd"
              [class.invalid]="submitted() && !form.companyName.trim()">
            @if (submitted() && !form.companyName.trim()) {
              <span class="error">Company name is required.</span>
            }
          </div>
          <div class="grid grid-2">
            <div class="field">
              <label>Email</label>
              <input name="email" [(ngModel)]="form.email" placeholder="billing@acme.in" [class.invalid]="emailInvalid()">
              @if (emailInvalid()) { <span class="error">Enter a valid email address.</span> }
            </div>
            <div class="field">
              <label>Phone</label>
              <input name="phone" [(ngModel)]="form.phone" placeholder="98765 43210">
            </div>
          </div>
          <div class="field">
            <label>GSTIN</label>
            <input name="gstin" class="mono" [(ngModel)]="form.gstin" placeholder="27ABCDE1234F1Z5" [class.invalid]="gstinInvalid()">
            @if (gstinInvalid()) { <span class="error">Enter a valid 15-character GSTIN.</span> }
          </div>
          <div class="field">
            <label>Address</label>
            <input name="address" [(ngModel)]="form.address" placeholder="Street, city, PIN">
          </div>
          <div class="field">
            <label>State</label>
            <select name="stateCode" [(ngModel)]="form.stateCode">
              @for (s of states; track s.code) {
                <option [value]="s.code">{{ s.name }} ({{ s.code }})</option>
              }
            </select>
          </div>
          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="modalOpen.set(false)">Cancel</button>
            <button class="btn primary" type="submit" [disabled]="saving()">
              {{ saving() ? 'Saving…' : (editing() ? 'Save Changes' : 'Add Client') }}
            </button>
          </div>
        </form>
      </app-modal>

      <!-- Delete confirm modal -->
      <app-modal [open]="!!deleteTarget()" title="Delete Client" [width]="420" (close)="deleteTarget.set(null)">
        <p style="margin:0 0 8px;font-size:13.5px">
          Delete <strong>{{ deleteTarget()?.companyName }}</strong>?
        </p>
        <p style="margin:0;font-size:12.5px;color:var(--muted)">
          Invoices already raised for this client will remain on file — only the client record is removed.
        </p>
        <div class="modal-foot">
          <button class="btn ghost" type="button" (click)="deleteTarget.set(null)">Cancel</button>
          <button class="btn danger solid" type="button" [disabled]="deleting()" (click)="confirmDelete()">
            {{ deleting() ? 'Deleting…' : 'Delete Client' }}
          </button>
        </div>
      </app-modal>
    </app-shell>
  `
})
export class ClientsComponent implements OnInit {
  loading = signal(true);
  clients = signal<Client[]>([]);
  search = signal('');

  modalOpen = signal(false);
  editing = signal<Client | null>(null);
  saving = signal(false);
  submitted = signal(false);

  deleteTarget = signal<Client | null>(null);
  deleting = signal(false);

  form: ClientForm = this.blankForm();

  states = STATES;
  stateName = stateName;

  page = signal(1);
  pageSize = signal(10);

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.clients();
    return this.clients().filter(c =>
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.gstin || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  constructor(private api: ApiService, private toast: ToastService) {}

  onSearch(v: string) { this.search.set(v); this.page.set(1); }
  onPageSize(v: number) { this.pageSize.set(v); this.page.set(1); }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.clients().subscribe({
      next: list => { this.clients.set(list); this.loading.set(false); },
      error: err => { this.loading.set(false); this.toast.httpError(err); }
    });
  }

  private blankForm(): ClientForm {
    return { companyName: '', email: '', phone: '', gstin: '', address: '', stateCode: '27' };
  }

  openAdd() {
    this.editing.set(null);
    this.form = this.blankForm();
    this.submitted.set(false);
    this.modalOpen.set(true);
  }

  openEdit(c: Client) {
    this.editing.set(c);
    this.form = {
      companyName: c.companyName || '',
      email: c.email || '',
      phone: c.phone || '',
      gstin: c.gstin || '',
      address: c.address || '',
      stateCode: c.stateCode || '27'
    };
    this.submitted.set(false);
    this.modalOpen.set(true);
  }

  emailInvalid(): boolean {
    return !!this.form.email.trim() && !isValidEmail(this.form.email.trim());
  }

  gstinInvalid(): boolean {
    return !!this.form.gstin.trim() && !isValidGSTIN(this.form.gstin.trim());
  }

  save() {
    this.submitted.set(true);
    if (!this.form.companyName.trim() || this.emailInvalid() || this.gstinInvalid()) return;

    const payload: Partial<Client> = {
      companyName: this.form.companyName.trim(),
      email: this.form.email.trim(),
      phone: this.form.phone.trim(),
      gstin: this.form.gstin.trim().toUpperCase(),
      address: this.form.address.trim(),
      stateCode: this.form.stateCode,
      state: stateName(this.form.stateCode)
    };

    const editing = this.editing();
    this.saving.set(true);
    const req = editing ? this.api.updateClient(editing._id, payload) : this.api.createClient(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(editing ? 'Client updated' : 'Client added');
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.httpError(err); }
    });
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleting.set(true);
    this.api.deleteClient(target._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.toast.success('Client deleted');
        this.load();
      },
      error: err => { this.deleting.set(false); this.toast.httpError(err); }
    });
  }
}
