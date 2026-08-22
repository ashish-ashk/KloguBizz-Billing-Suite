import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../core/toast.service';
import { avatarColor, initials } from '../core/format';
import { IconComponent } from './icons';

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

let modalSeq = 0;

/**
 * The modals currently open, innermost last.
 *
 * Escape is on `document`, so without this every open dialog hears it — and a
 * confirm stacked over a form (which several pages do) would close both at once,
 * throwing away the form the user was only trying to get back to.
 */
const openModals: object[] = [];

/**
 * Modal dialog. Renders nothing while closed.
 *
 * ── Why the focus handling below exists ────────────────────────────
 *
 * Measured at a phone viewport with a modal open: **thirteen of the next
 * fourteen Tab presses left the modal** and landed on the page behind it —
 * including the per-row Delete buttons on the customer list. The page was
 * covered, dimmed and unscrollable, and still fully operable by keyboard. A
 * switch-access or keyboard user could delete a customer they could not see.
 *
 * Focus also did not move into the dialog when it opened, so a screen reader
 * user got no indication anything had happened.
 *
 * Fixed here rather than in each caller, because every modal in the app is this
 * one component and the bug was in all of them equally.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="modal-overlay no-print" (click)="close.emit()">
        <div #panel class="modal-panel" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId"
          [style.--modal-w]="width + 'px'" (click)="$event.stopPropagation()">
          <div class="modal-scroll">
            <div class="modal-head">
              <div class="modal-title" [id]="titleId">{{ title }}</div>
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

  @ViewChild('panel') panel?: ElementRef<HTMLElement>;

  /** Ties the dialog to its own heading, so it is announced by name. */
  titleId = `modal-title-${(modalSeq += 1)}`;

  /** Whatever had focus before we took it, so it can be given back on close. */
  private returnFocusTo: HTMLElement | null = null;

  private static readonly FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  // Locks page scroll behind the overlay while any modal is open. Shared
  // counter (rather than a plain boolean) so two modals opening in quick
  // succession — e.g. a confirm dialog over a form — don't have the first
  // one's close unlock scroll while the second is still up.
  ngOnChanges(changes: SimpleChanges) {
    if (!changes['open']) return;
    const wasOpen = !!changes['open'].previousValue;
    const isOpen = !!changes['open'].currentValue;
    if (isOpen === wasOpen) return;
    if (isOpen) {
      pushScrollLock();
      openModals.push(this);
      this.returnFocusTo = document.activeElement as HTMLElement | null;
      // After the view has rendered the panel — there is nothing to focus before that.
      setTimeout(() => this.focusFirst(), 0);
    } else {
      popScrollLock();
      this.leaveStack();
      /**
       * Focus goes back where it came from. Otherwise closing a dialog drops
       * focus to the top of the document, and a keyboard user has to tab all
       * the way back to the row they were working on.
       */
      const target = this.returnFocusTo;
      this.returnFocusTo = null;
      if (target?.isConnected) setTimeout(() => target.focus(), 0);
    }
  }

  ngOnDestroy() {
    if (this.open) popScrollLock();
    this.leaveStack();
  }

  private leaveStack() {
    const at = openModals.indexOf(this);
    if (at >= 0) openModals.splice(at, 1);
  }

  /**
   * Escape closes it — expected of any dialog, and the only way out without a
   * mouse. Only the innermost one, so a confirm over a form closes the confirm
   * and leaves the form standing.
   */
  @HostListener('document:keydown.escape')
  onEscape() {
    if (!this.open) return;
    if (openModals[openModals.length - 1] !== this) return;
    this.close.emit();
  }

  /** Tab is likewise only trapped by the innermost dialog. */
  private isTopmost() {
    return openModals[openModals.length - 1] === this;
  }

  /**
   * Keeps Tab inside the dialog by wrapping at each end.
   *
   * Deliberately not `inert` on everything else: that would mean reaching outside
   * this component to mark the rest of the document, and a modal that failed to
   * clean up (an error mid-close, a route change) would leave the whole app
   * inert and unusable. Cycling within the panel cannot leave the app broken.
   */
  @HostListener('document:keydown.tab', ['$event'])
  onTab(event: KeyboardEvent) {
    if (!this.open || !this.isTopmost()) return;
    const items = this.focusable();
    if (!items.length) return;

    const active = document.activeElement as HTMLElement | null;
    const inside = !!active && !!this.panel?.nativeElement.contains(active);
    const first = items[0];
    const last = items[items.length - 1];

    // Focus escaped (or never arrived) — pull it back to the appropriate end.
    if (!inside) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }
    if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
  }

  private focusable(): HTMLElement[] {
    const root = this.panel?.nativeElement;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(ModalComponent.FOCUSABLE))
      // A hidden file input is focusable by selector but not by keyboard, and
      // landing on one is a dead stop for the user.
      .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
  }

  private focusFirst() {
    const items = this.focusable();
    /**
     * The first *useful* control, not the close button — otherwise every dialog
     * opens with "dismiss this" selected, and Enter throws away what the user
     * came to do.
     */
    const preferred = items.find(el => !el.classList.contains('modal-close'));
    (preferred || items[0] || this.panel?.nativeElement)?.focus();
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

/**
 * Compact "⋮" action menu for table rows with more actions than comfortably
 * fit inline on a mobile card — keep the single most-used action visible
 * next to this, and tuck the rest inside via <ng-content>.
 */
@Component({
  selector: 'app-overflow-menu',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="overflow-menu">
      <button class="btn ghost sm" type="button" aria-label="More actions" (click)="toggle($event)">
        <app-icon name="moreVertical" [size]="16" />
      </button>
      @if (open) {
        <div class="overflow-menu-panel" (click)="onPanelClick()">
          <ng-content />
        </div>
      }
    </div>
  `,
  styles: [`
    .overflow-menu { position: relative; display: inline-block; }
    .overflow-menu-panel {
      position: absolute; right: 0; top: calc(100% + 6px); z-index: 30;
      min-width: 160px; background: var(--card); border: 1px solid var(--border);
      border-radius: 10px; box-shadow: var(--shadow-md); padding: 6px; display: grid; gap: 2px;
    }
  `],
  host: { '(document:click)': 'onDocumentClick($event)' }
})
export class OverflowMenuComponent {
  open = false;

  constructor(private el: ElementRef<HTMLElement>) {}

  toggle(event: MouseEvent) {
    event.stopPropagation();
    this.open = !this.open;
  }

  // Any click on an action inside the panel closes the menu after that
  // action's own click handler has already run (event bubbles target-first).
  onPanelClick() {
    this.open = false;
  }

  onDocumentClick(event: MouseEvent) {
    if (this.open && !this.el.nativeElement.contains(event.target as Node)) this.open = false;
  }
}
