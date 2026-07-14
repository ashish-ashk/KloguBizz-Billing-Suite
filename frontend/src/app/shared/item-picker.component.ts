import { Component, ElementRef, HostListener, computed, inject, input, model, output, signal, viewChild } from '@angular/core';
import { Item } from '../core/models';

/**
 * Free-text input that also offers a filtered dropdown of catalog items.
 * Mirrors the quick-search combobox pattern (signal query/active index,
 * outside-click close, arrow-key nav) so line items can be searched and
 * dropped in, while still allowing plain typing when nothing matches.
 */
@Component({
  selector: 'app-item-picker',
  standalone: true,
  template: `
    <div class="item-picker" [class.open]="dropdownOpen()">
      <input #inputEl class="input" type="text" [placeholder]="placeholder()" autocomplete="off"
        [value]="value()" (input)="onInput($event)" (focus)="onFocus()" (keydown)="onKeydown($event)" />
      @if (dropdownOpen()) {
        <div class="item-picker-dropdown">
          @for (it of filtered(); track it._id; let i = $index) {
            <button type="button" class="cmdk-item" [class.active]="i === activeIndex()"
              (click)="pick(it)" (mouseenter)="activeIndex.set(i)">
              <span class="cmdk-item-label">
                <span style="font-weight:600;">{{ it.name }}</span>
                <span class="muted" style="margin-left:6px;font-size:11.5px;">{{ it.itemCode || it.hsn || '' }}</span>
              </span>
              <span class="muted" style="font-size:11.5px;">{{ fmtRate(it) }}</span>
            </button>
          } @empty {
            <div class="cmdk-empty">No matching items — keep typing to enter free text.</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .item-picker { position: relative; }
    .item-picker-dropdown {
      position: absolute; top: calc(100% + 6px); left: 0; min-width: 260px; max-width: 360px;
      max-height: 300px; overflow-y: auto;
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: var(--shadow-lg); padding: 6px; z-index: 60;
    }
    .item-picker-dropdown .cmdk-item { width: 100%; justify-content: space-between; }
  `]
})
export class ItemPickerComponent {
  items = input.required<Item[]>();
  placeholder = input('Service or product description');
  value = model('');
  picked = output<Item>();

  private host = inject(ElementRef<HTMLElement>);
  activeIndex = signal(0);
  dropdownOpen = signal(false);
  inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  filtered = computed(() => {
    const q = this.value().toLowerCase().trim();
    const list = this.items();
    const matches = !q ? list : list.filter(it =>
      (it.name || '').toLowerCase().includes(q) ||
      (it.itemCode || '').toLowerCase().includes(q) ||
      (it.hsn || '').toLowerCase().includes(q) ||
      (it.category || '').toLowerCase().includes(q)
    );
    return matches.slice(0, 8);
  });

  fmtRate(it: Item): string {
    return '₹' + (it.sellingPrice ?? 0);
  }

  onFocus() {
    this.dropdownOpen.set(true);
    this.activeIndex.set(0);
  }

  onInput(e: Event) {
    this.value.set((e.target as HTMLInputElement).value);
    this.dropdownOpen.set(true);
    this.activeIndex.set(0);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.dropdownOpen.set(true); this.activeIndex.update(i => Math.min(i + 1, this.filtered().length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIndex.update(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { const it = this.filtered()[this.activeIndex()]; if (it) { e.preventDefault(); this.pick(it); } }
    else if (e.key === 'Escape') { this.close(); }
  }

  pick(it: Item) {
    this.value.set(it.name);
    this.picked.emit(it);
    this.close();
  }

  close() {
    this.dropdownOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target as Node)) this.close();
  }
}
