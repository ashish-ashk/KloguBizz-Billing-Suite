import { Component, computed, input } from '@angular/core';
import { EmptyStateComponent } from './ui';

export interface BarChartPoint {
  label: string;
  value: number;
}

/**
 * Lightweight CSS-driven vertical bar chart (no charting library) — extracted
 * from the dashboard's Monthly Revenue chart so other pages (e.g. Reports)
 * can render the same trend visualization instead of a bare table.
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    @if (data().length) {
      <div class="bar-chart">
        @for (d of data(); track d.label) {
          <div class="bar-col">
            <div class="bar" [style.height.%]="heightFor(d.value)" [title]="formatValue()(d.value)"></div>
            <div class="bar-label">{{ d.label }}</div>
          </div>
        }
      </div>
    } @else {
      <app-empty-state [icon]="emptyIcon()" [title]="emptyTitle()" [message]="emptyMessage()" />
    }
  `
})
export class BarChartComponent {
  data = input.required<BarChartPoint[]>();
  formatValue = input<(v: number) => string>(v => String(v));
  emptyIcon = input('▤');
  emptyTitle = input('No data yet');
  emptyMessage = input('');

  private max = computed(() => Math.max(...this.data().map(d => d.value), 1));

  heightFor(v: number): number {
    return Math.max(3, Math.round((v / this.max()) * 100));
  }
}
