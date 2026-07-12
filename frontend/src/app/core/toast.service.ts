import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  msg: string;
  type: 'success' | 'info' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  show(msg: string, type: Toast['type'] = 'success', duration = 3200) {
    const toast: Toast = { id: this.nextId++, msg, type };
    this.toasts.update(list => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), duration);
  }

  success(msg: string) { this.show(msg, 'success'); }
  info(msg: string) { this.show(msg, 'info'); }

  error(msg: string) { this.show(msg, 'error', 4500); }

  /** Extracts a readable message from an HttpErrorResponse. */
  httpError(err: unknown, fallback = 'Something went wrong. Please try again.') {
    const e = err as { error?: { message?: string }; message?: string };
    this.error(e?.error?.message || fallback);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
