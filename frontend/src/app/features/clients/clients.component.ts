import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppShellComponent } from '../../shared/app-shell.component';
import { AvatarComponent, EmptyStateComponent, ModalComponent, PagerComponent, SkeletonRowsComponent } from '../../shared/ui';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Client, ClientBulkUploadResult } from '../../core/models';
import { ServerList } from '../../core/server-list';
import { STATES, downloadBlob, isValidEmail, isValidGSTIN, stateName } from '../../core/format';

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
    <app-shell title="Clients" [subtitle]="subtitle()">
      <button actions class="btn secondary" type="button" (click)="openBulkUpload()">⇪ Import CSV</button>
      <button actions class="btn primary" type="button" (click)="openAdd()">+ Add Client</button>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">⌕</span>
          <input class="input" type="text" placeholder="Search name, GSTIN, email or phone"
            [ngModel]="list.search()" (ngModelChange)="list.onSearch($event)">
        </div>
      </div>

      <div class="card flush">
        @if (list.loading()) {
          <app-skeleton-rows [count]="5" />
        } @else if (list.failed()) {
          <app-empty-state icon="⚠" title="Could not load clients"
            message="Something went wrong fetching this page." />
        } @else if (list.total() === 0 && !list.search()) {
          <app-empty-state icon="◫" title="No clients yet" message="Add your first client to start invoicing." />
        } @else if (list.rows().length === 0) {
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
                @for (c of list.rows(); track c._id) {
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
          <app-pager [page]="list.page()" [pageSize]="list.pageSize()" [total]="list.total()"
            (pageChange)="list.onPage($event)" (pageSizeChange)="list.onPageSize($event)" />
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

      <!-- Bulk import modal -->
      <app-modal [open]="bulkModalOpen()" title="Import Customers from CSV" [width]="680" (close)="bulkModalOpen.set(false)">
        <div class="bulk-upload">
          <ol class="bulk-steps">
            <li>
              <div>
                Download the template and put <strong>one customer per row</strong>. Only the
                <strong>customer name</strong> is required.
              </div>
              <button class="btn secondary sm" type="button" [disabled]="downloadingTemplate()"
                (click)="downloadTemplate()">
                {{ downloadingTemplate() ? 'Preparing…' : '⬇ Download CSV Template' }}
              </button>
            </li>
            <li>
              <!--
                Both of these answer a question the file itself cannot: what goes in
                the State column, and what happens if the GSTIN already says. The
                item importer puts this on a "Read Me" sheet, which a CSV cannot
                have — so it goes here, beside the button.
              -->
              <div>
                For <strong>State</strong>, write the name (<span class="mono">Maharashtra</span>) or its
                GST number (<span class="mono">27</span>) — either is fine. If you give a
                <strong>GSTIN</strong>, you can leave State blank: the first two digits of a GSTIN
                <em>are</em> the state.
              </div>
            </li>
            <li>
              <div>
                Choose your file and upload. Every row is checked on its own, so
                <strong>good rows are added even if some rows have problems</strong> — anything we
                could not add is listed below with its row number so you can fix just those.
              </div>
              <div class="file-picker">
                <input #csvInput type="file" accept=".csv,text/csv,.xlsx" style="display:none"
                  (change)="onFileSelected($event)">
                <button class="btn secondary sm" type="button" (click)="csvInput.click()">Choose File</button>
                <span class="muted file-name" style="font-size:12.5px;">{{ selectedFile()?.name || 'No file chosen' }}</span>
              </div>
            </li>
          </ol>

          @if (uploadError()) {
            <div class="info-box danger">{{ uploadError() }}</div>
          }

          @if (uploadResult(); as result) {
            <div class="info-box"
              [class.ok]="result.failed.length === 0"
              [class.warn]="result.failed.length > 0 && result.created > 0"
              [class.danger]="result.created === 0 && result.failed.length > 0">
              <strong>{{ result.created }}</strong> of {{ result.totalRows }}
              {{ result.totalRows === 1 ? 'customer' : 'customers' }} added.
              @if (result.failed.length > 0) {
                {{ result.failed.length }} {{ result.failed.length === 1 ? 'row' : 'rows' }} could not be added — see below.
              }
            </div>
            @if (result.failed.length > 0) {
              <div class="table-wrap upload-errors">
                <table class="table stack-mobile">
                  <thead><tr><th>Row</th><th>Customer</th><th>What to fix</th></tr></thead>
                  <tbody>
                    @for (f of result.failed; track f.row) {
                      <tr>
                        <td data-label="Row">{{ f.row }}</td>
                        <td data-label="Customer">{{ f.companyName || f.gstin || '—' }}</td>
                        <td data-label="What to fix">
                          <ul class="err-list">
                            @for (e of f.errors; track e) { <li>{{ e }}</li> }
                          </ul>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }

          <div class="modal-foot">
            <button class="btn ghost" type="button" (click)="bulkModalOpen.set(false)">Close</button>
            <button class="btn primary" type="button" [disabled]="!selectedFile() || uploading()"
              (click)="uploadFile()">
              {{ uploading() ? 'Uploading…' : 'Upload & Add Customers' }}
            </button>
          </div>
        </div>
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
export class ClientsComponent implements OnInit, OnDestroy {
  /**
   * Paging, searching and sorting happen in the database. This page used to load
   * every client the tenant had, filter them in `computed()` and slice out a
   * page — so the "page size" only ever controlled how many of the
   * already-downloaded rows were painted.
   */
  list = new ServerList<Client>(params => this.api.clients(params));

  modalOpen = signal(false);
  editing = signal<Client | null>(null);
  saving = signal(false);
  submitted = signal(false);

  deleteTarget = signal<Client | null>(null);
  deleting = signal(false);

  bulkModalOpen = signal(false);
  downloadingTemplate = signal(false);
  selectedFile = signal<File | null>(null);
  uploading = signal(false);
  uploadError = signal('');
  uploadResult = signal<ClientBulkUploadResult | null>(null);

  form: ClientForm = this.blankForm();

  states = STATES;
  stateName = stateName;

  constructor(private api: ApiService, private toast: ToastService) {}

  subtitle() {
    const total = this.list.total();
    if (this.list.search()) return `${total} matching ${total === 1 ? 'client' : 'clients'}`;
    return `${total} ${total === 1 ? 'client' : 'clients'} on file`;
  }

  ngOnInit() { this.list.load(); }
  ngOnDestroy() { this.list.dispose(); }

  load() { this.list.refresh(); }

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

  // ── Importing a customer list ──────────────────────────────────────────

  openBulkUpload() {
    this.selectedFile.set(null);
    this.uploadError.set('');
    this.uploadResult.set(null);
    this.bulkModalOpen.set(true);
  }

  downloadTemplate() {
    this.downloadingTemplate.set(true);
    this.api.downloadClientsTemplate().subscribe({
      next: blob => {
        this.downloadingTemplate.set(false);
        downloadBlob(blob, 'klogubizz-customers-template.csv');
      },
      error: err => {
        this.downloadingTemplate.set(false);
        this.toast.httpError(err, 'Could not download the template.');
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.uploadError.set('');
    this.uploadResult.set(null);
    /**
     * Checked here as well as on the server, so choosing the wrong file says so
     * immediately rather than after an upload. `.xlsx` is allowed because somebody
     * who opens the CSV template in Excel and presses Save produces one.
     */
    if (file && !/\.(csv|txt|xlsx)$/i.test(file.name)) {
      this.uploadError.set(`"${file.name}" is not a CSV. Save your list as .csv (or upload the .xlsx you saved from the template).`);
      this.selectedFile.set(null);
      input.value = '';
      return;
    }
    this.selectedFile.set(file);
  }

  uploadFile() {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set('');
    this.uploadResult.set(null);
    this.api.bulkUploadClients(file).subscribe({
      next: result => {
        this.uploading.set(false);
        this.uploadResult.set(result);
        // Cleared, so pressing Upload again cannot silently import the same file
        // twice — which for customers means duplicate records, not just noise.
        this.selectedFile.set(null);
        if (result.created > 0) {
          const skipped = result.failed.length ? `, ${result.failed.length} skipped` : '';
          this.toast.success(`${result.created} ${result.created === 1 ? 'customer' : 'customers'} added${skipped}.`);
          this.load();
        } else if (result.failed.length > 0) {
          this.toast.error('Nothing was added — fix the rows listed and upload again.');
        }
      },
      error: err => {
        this.uploading.set(false);
        // The server's own words: they name the column, the row or the file type.
        this.uploadError.set(err?.error?.message || 'That upload did not work. Please try again.');
      }
    });
  }
}
