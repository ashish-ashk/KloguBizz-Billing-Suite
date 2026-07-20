import { Component, EventEmitter, Input, Output, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
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

/** Modal dialog. Renders nothing while closed. */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="modal-overlay no-print" (click)="close.emit()">
        <div class="modal-panel" [style.width.px]="width" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div class="modal-title">{{ title }}</div>
            <button class="modal-close" type="button" (click)="close.emit()" aria-label="Close">✕</button>
          </div>
          <ng-content />
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() width = 480;
  @Output() close = new EventEmitter<void>();
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
