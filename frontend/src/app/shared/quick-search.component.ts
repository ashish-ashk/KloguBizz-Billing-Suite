import { Component, ElementRef, HostListener, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { IconComponent } from './icons';

export interface CommandItem {
  label: string;
  route: string;
  icon: string;
  hint?: string;
}

/**
 * Topbar quick-nav: an always-visible input (not a modal) that filters the
 * app's real routes as you type, with an anchored dropdown of matches.
 * Ctrl/Cmd+K focuses it from anywhere via the host shell.
 */
@Component({
  selector: 'app-quick-search',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="qsearch" [class.open]="dropdownOpen()" (click)="focusInput()">
      <button type="button" class="qsearch-icon-btn" tabindex="-1" aria-label="Search" (click)="focusInput()">
        <app-icon name="search" [size]="15" class="qsearch-icon" />
      </button>
      <input #inputEl class="qsearch-input" type="text" placeholder="Search or jump to&hellip;"
        [value]="query()" (input)="onInput($event)" (focus)="onFocus()" (keydown)="onKeydown($event)" autocomplete="off" />
      @if (!dropdownOpen() || !query()) { <span class="kbd qsearch-kbd">Ctrl K</span> }
      @if (dropdownOpen()) {
        <div class="qsearch-dropdown">
          @for (item of filtered(); track item.route; let i = $index) {
            <button type="button" class="cmdk-item" [class.active]="i === activeIndex()"
              (click)="go(item)" (mouseenter)="activeIndex.set(i)">
              <span class="cmdk-item-icon"><app-icon [name]="item.icon" [size]="16" /></span>
              <span class="cmdk-item-label">{{ item.label }}</span>
              @if (i === activeIndex()) { <app-icon name="cornerDownLeft" [size]="14" class="cmdk-item-enter" /> }
            </button>
          } @empty {
            <div class="cmdk-empty">No matching pages for "{{ query() }}"</div>
          }
        </div>
      }
    </div>
  `
})
export class QuickSearchComponent {
  items = input.required<CommandItem[]>();
  navigate = output<string>();

  private host = inject(ElementRef<HTMLElement>);
  query = signal('');
  activeIndex = signal(0);
  dropdownOpen = signal(false);
  inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const list = this.items();
    if (!q) return list;
    return list.filter(i => i.label.toLowerCase().includes(q));
  });

  focusInput() {
    this.inputRef()?.nativeElement.focus();
  }

  onFocus() {
    this.dropdownOpen.set(true);
    this.activeIndex.set(0);
  }

  onInput(e: Event) {
    this.query.set((e.target as HTMLInputElement).value);
    this.dropdownOpen.set(true);
    this.activeIndex.set(0);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); this.dropdownOpen.set(true); this.activeIndex.update(i => Math.min(i + 1, this.filtered().length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIndex.update(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const item = this.filtered()[this.activeIndex()]; if (item) this.go(item); }
    else if (e.key === 'Escape') { e.preventDefault(); this.close(); this.inputRef()?.nativeElement.blur(); }
  }

  go(item: CommandItem) {
    this.navigate.emit(item.route);
    this.close();
    this.inputRef()?.nativeElement.blur();
  }

  close() {
    this.dropdownOpen.set(false);
    this.query.set('');
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target as Node)) this.close();
  }
}
