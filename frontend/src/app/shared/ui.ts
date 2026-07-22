import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../core/toast.service';
import { avatarColor, initials } from '../core/format';

/** Global toast region — include once in each top-level layout. */
@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-region no-print">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.info]="t.type === 'info'" [class.error]="t.type === 'error'" (click)="toast.dismiss(t.id)">
          <span class="t-icon">{{ t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i' }}</span>
          <span class="t-msg">{{ t.msg }}</span>
        </div>
      }
    </div>
  `
})
export class ToastsComponent {
  constructor(public toast: ToastService) {}
}

// Shared body-scroll lock, counter-based so a modal opening while the mobile
// nav drawer is still up (or vice versa) doesn't have one's close unlock
// scroll while the other is still open.
let scrollLockCount = 0;
export function pushScrollLock() {
  scrollLockCount++;
  document.body.style.overflow = 'hidden';
}
export function popScrollLock() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = '';
}

/** Modal dialog. Renders nothing while closed. */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="modal-overlay no-print" (click)="close.emit()">
        <div class="modal-panel" [style.width.px]="width" (click)="$event.stopPropagation()">
          <div class="modal-scroll">
            <div class="modal-head">
              <div class="modal-title">{{ title }}</div>
              <button class="modal-close" type="button" (click)="close.emit()" aria-label="Close">✕</button>
            </div>
            <ng-content />
          </div>
        </div>
      </div>
    }
  `
})
export class ModalComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() title = '';
  @Input() width = 480;
  @Output() close = new EventEmitter<void>();

  // Locks page scroll behind the overlay while any modal is open. Shared
  // counter (rather than a plain boolean) so two modals opening in quick
  // succession — e.g. a confirm dialog over a form — don't have the first
  // one's close unlock scroll while the second is still up.
  ngOnChanges(changes: SimpleChanges) {
    if (!changes['open']) return;
    const wasOpen = !!changes['open'].previousValue;
    const isOpen = !!changes['open'].currentValue;
    if (isOpen === wasOpen) return;
    if (isOpen) pushScrollLock(); else popScrollLock();
  }

  ngOnDestroy() {
    if (this.open) popScrollLock();
  }
}

/** Status pill with a colored dot. */
@Component({
  selector: 'app-pill',
  standalone: true,
  template: `<span class="pill" [class]="'pill ' + status"><span class="dot"></span>{{ label || defaultLabel }}</span>`
})
export class PillComponent {
  @Input() status = 'draft';
  @Input() label = '';
  get defaultLabel(): string {
    const map: Record<string, string> = {
      paid: 'Paid', pending: 'Pending', overdue: 'Overdue', draft: 'Draft', partial: 'Partial',
      active: 'Active', trial: 'Trial', suspended: 'Suspended', cancelled: 'Cancelled',
      invited: 'Invited', disabled: 'Disabled', success: 'Success', failed: 'Failed',
      admin: 'Admin', accountant: 'Accountant', viewer: 'Viewer', inactive: 'Inactive'
    };
    return map[this.status] || this.status;
  }
}

/** Initials avatar with a deterministic color per name. */
@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <span class="avatar"
      [style.width.px]="size" [style.height.px]="size"
      [style.fontSize.px]="size * 0.36"
      [style.background]="colors().bg" [style.color]="colors().color">{{ text() }}</span>
  `
})
export class AvatarComponent {
  name = input('');
  @Input() size = 32;
  colors = computed(() => avatarColor(this.name()));
  text = computed(() => initials(this.name()));
}

/** Centered empty-state block for tables and lists. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state">
      <div class="es-icon-ring"><div class="es-icon">{{ icon }}</div></div>
      <div class="es-title">{{ title }}</div>
      <div>{{ message }}</div>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon = '◧';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
}

/** Full-width loading placeholder rows. */
@Component({
  selector: 'app-skeleton-rows',
  standalone: true,
  template: `
    @for (r of rows(); track $index) {
      <div class="skeleton" style="height:44px;margin:10px 16px;"></div>
    }
  `
})
export class SkeletonRowsComponent {
  @Input() count = 4;
  rows = () => Array.from({ length: this.count });
}

/** Page-size + prev/next pager for client-side-paginated tables and lists. */
@Component({
  selector: 'app-pager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (total > 0) {
      <div class="pager">
        <div class="pager-info">Showing {{ startIndex + 1 }}–{{ endIndex }} of {{ total }}</div>
        <div class="pager-controls">
          <select class="pager-size" [ngModel]="pageSize" (ngModelChange)="pageSizeChange.emit($event)">
            @for (s of pageSizeOptions; track s) { <option [ngValue]="s">{{ s }} / page</option> }
          </select>
          <button class="btn ghost sm" type="button" [disabled]="page <= 1" (click)="pageChange.emit(page - 1)">‹ Prev</button>
          <span class="pager-page">Page {{ page }} of {{ totalPages }}</span>
          <button class="btn ghost sm" type="button" [disabled]="page >= totalPages" (click)="pageChange.emit(page + 1)">Next ›</button>
        </div>
      </div>
    }
  `
})
export class PagerComponent {
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Input() pageSizeOptions = [10, 25, 50, 100];
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get startIndex(): number { return this.total === 0 ? 0 : (this.page - 1) * this.pageSize; }
  get endIndex(): number { return Math.min(this.total, this.page * this.pageSize); }
}
