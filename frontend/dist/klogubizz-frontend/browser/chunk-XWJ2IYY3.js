import {
  BarChartComponent
} from "./chunk-F3C2B2X2.js";
import {
  AppShellComponent
} from "./chunk-YNECOBXO.js";
import "./chunk-4KISL3AY.js";
import "./chunk-FOTQGH3M.js";
import {
  EmptyStateComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-OBVHAWX5.js";
import {
  downloadBlob,
  fmtINR,
  monthLabel
} from "./chunk-7F65RAZH.js";
import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import "./chunk-XAFCZYPI.js";
import "./chunk-6FSA7WVR.js";
import "./chunk-FVB5LDTQ.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
import {
  CommonModule,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-6VNHH65J.js";

// src/app/features/reports/reports.component.ts
var _forTrack0 = ($index, $item) => $item.month;
var _forTrack1 = ($index, $item) => $item.rate;
function ReportsComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 2);
  }
}
function ReportsComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4);
    \u0275\u0275element(1, "app-skeleton-rows", 5);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 6);
  }
}
function ReportsComponent_Conditional_6_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4);
    \u0275\u0275element(1, "app-empty-state", 6);
    \u0275\u0275elementEnd();
  }
}
function ReportsComponent_Conditional_6_Conditional_1_For_67_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 31);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 32);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td", 33);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td", 34);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "td", 35);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td", 36);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "td", 37);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const m_r1 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", ctx_r1.monthLabel(m_r1.month), " ", m_r1.month.slice(0, 4), "");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(m_r1.invoiceCount);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(m_r1.taxable));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(m_r1.cgst));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(m_r1.sgst));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(m_r1.igst));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(m_r1.total));
  }
}
function ReportsComponent_Conditional_6_Conditional_1_For_87_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 38)(2, "span", 39);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "td", 33);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "td", 40);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const r_r3 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("", r_r3.rate, "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(r_r3.taxable));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(r_r3.tax));
  }
}
function ReportsComponent_Conditional_6_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "section", 7)(1, "div", 8);
    \u0275\u0275element(2, "div", 9);
    \u0275\u0275elementStart(3, "div", 10)(4, "span", 11);
    \u0275\u0275text(5, "Taxable Value");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 12);
    \u0275\u0275element(7, "app-icon", 13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 14);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 15);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 16);
    \u0275\u0275element(13, "div", 9);
    \u0275\u0275elementStart(14, "div", 10)(15, "span", 11);
    \u0275\u0275text(16, "Tax Collected");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span", 12);
    \u0275\u0275element(18, "app-icon", 17);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(19, "div", 18);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 15);
    \u0275\u0275text(22, "CGST + SGST + IGST combined");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "div", 19);
    \u0275\u0275element(24, "div", 9);
    \u0275\u0275elementStart(25, "div", 10)(26, "span", 11);
    \u0275\u0275text(27, "Total Billed");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "span", 12);
    \u0275\u0275element(29, "app-icon", 20);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 21);
    \u0275\u0275text(31);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "div", 15);
    \u0275\u0275text(33, "Taxable value + tax");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(34, "section", 22)(35, "div", 23);
    \u0275\u0275text(36, "Taxable Value by Month");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "div", 24);
    \u0275\u0275text(38, "Trend across issued invoices");
    \u0275\u0275elementEnd();
    \u0275\u0275element(39, "app-bar-chart", 25);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(40, "section", 26)(41, "div", 27)(42, "div")(43, "div", 23);
    \u0275\u0275text(44, "GST Summary by Month");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "div", 28);
    \u0275\u0275text(46, "For GSTR filing \u2014 draft invoices excluded");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(47, "div", 29)(48, "table", 30)(49, "thead")(50, "tr")(51, "th");
    \u0275\u0275text(52, "Month");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "th");
    \u0275\u0275text(54, "Invoices");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(55, "th");
    \u0275\u0275text(56, "Taxable Value");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(57, "th");
    \u0275\u0275text(58, "CGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(59, "th");
    \u0275\u0275text(60, "SGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(61, "th");
    \u0275\u0275text(62, "IGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(63, "th");
    \u0275\u0275text(64, "Total");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(65, "tbody");
    \u0275\u0275repeaterCreate(66, ReportsComponent_Conditional_6_Conditional_1_For_67_Template, 15, 8, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(68, "section", 4)(69, "div", 27)(70, "div")(71, "div", 23);
    \u0275\u0275text(72, "GST Rate Breakdown");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(73, "div", 28);
    \u0275\u0275text(74, "Taxable value and tax collected per GST slab");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(75, "div", 29)(76, "table", 30)(77, "thead")(78, "tr")(79, "th");
    \u0275\u0275text(80, "Rate");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(81, "th");
    \u0275\u0275text(82, "Taxable Value");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(83, "th");
    \u0275\u0275text(84, "Tax Collected");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(85, "tbody");
    \u0275\u0275repeaterCreate(86, ReportsComponent_Conditional_6_Conditional_1_For_87_Template, 8, 3, "tr", null, _forTrack1);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const s_r4 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275property("size", 15);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(s_r4.totals.taxable, true));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("Across ", s_r4.totals.invoiceCount, " issued invoice", s_r4.totals.invoiceCount === 1 ? "" : "s", "");
    \u0275\u0275advance(7);
    \u0275\u0275property("size", 15);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(s_r4.totals.tax, true));
    \u0275\u0275advance(9);
    \u0275\u0275property("size", 15);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(s_r4.totals.taxable + s_r4.totals.tax, true));
    \u0275\u0275advance(8);
    \u0275\u0275property("data", ctx_r1.taxableChartData(s_r4))("formatValue", ctx_r1.fmtINR);
    \u0275\u0275advance(27);
    \u0275\u0275repeater(s_r4.byMonth);
    \u0275\u0275advance(20);
    \u0275\u0275repeater(s_r4.byRate);
  }
}
function ReportsComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, ReportsComponent_Conditional_6_Conditional_0_Template, 2, 0, "div", 4)(1, ReportsComponent_Conditional_6_Conditional_1_Template, 88, 10);
  }
  if (rf & 2) {
    \u0275\u0275conditional(ctx.totals.invoiceCount === 0 ? 0 : 1);
  }
}
var ReportsComponent = class _ReportsComponent {
  api;
  toast;
  loading = signal(true);
  exporting = signal(false);
  summary = signal(null);
  fmtINR = fmtINR;
  monthLabel = monthLabel;
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.api.gstSummary().subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err, "Could not load reports.");
      }
    });
  }
  taxableChartData(s) {
    return s.byMonth.map((m) => ({ label: `${this.monthLabel(m.month)} ${m.month.slice(0, 4)}`, value: m.taxable }));
  }
  exportCsv() {
    this.exporting.set(true);
    this.api.exportGstSummaryCsv().subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, "gst-summary.csv");
      },
      error: (err) => {
        this.exporting.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function ReportsComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ReportsComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ReportsComponent, selectors: [["app-reports"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 7, vars: 5, consts: [["title", "Reports", "subtitle", "GST filing summary and revenue insights, straight from your issued invoices"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], [1, "spinner"], ["name", "download", 3, "size"], [1, "card", "flush"], [3, "count"], ["icon", "\u25E7", "title", "No issued invoices yet", "message", "Draft invoices are excluded \u2014 create and send your first invoice to see reports here."], [1, "grid", "grid-3", 2, "margin-bottom", "20px"], [1, "card", "metric", "indigo"], [1, "accent"], [1, "metric-row"], [1, "label"], [1, "m-icon"], ["name", "rupee", 3, "size"], [1, "value"], [1, "sub"], [1, "card", "metric", "purple"], ["name", "percent", 3, "size"], [1, "value", 2, "color", "var(--purple)"], [1, "card", "metric", "success"], ["name", "invoice", 3, "size"], [1, "value", 2, "color", "var(--green)"], [1, "card", 2, "margin-bottom", "20px"], [1, "card-title"], [1, "card-sub", 2, "margin-bottom", "18px"], ["emptyIcon", "\u25A4", "emptyTitle", "No trend yet", "emptyMessage", "Taxable value will chart here month by month.", 3, "data", "formatValue"], [1, "card", "flush", 2, "margin-bottom", "20px"], [1, "card-head"], [1, "card-sub"], [1, "table-wrap"], [1, "table", "stack-mobile"], ["data-label", "Month", 1, "strong"], ["data-label", "Invoices", 1, "muted"], ["data-label", "Taxable Value"], ["data-label", "CGST", 1, "muted"], ["data-label", "SGST", 1, "muted"], ["data-label", "IGST", 1, "muted"], ["data-label", "Total", 1, "num"], ["data-label", "Rate"], [1, "pill"], ["data-label", "Tax Collected", 1, "strong"]], template: function ReportsComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0)(1, "button", 1);
      \u0275\u0275listener("click", function ReportsComponent_Template_button_click_1_listener() {
        return ctx.exportCsv();
      });
      \u0275\u0275template(2, ReportsComponent_Conditional_2_Template, 1, 0, "span", 2);
      \u0275\u0275element(3, "app-icon", 3);
      \u0275\u0275text(4, " Export Monthly CSV ");
      \u0275\u0275elementEnd();
      \u0275\u0275template(5, ReportsComponent_Conditional_5_Template, 2, 1, "div", 4)(6, ReportsComponent_Conditional_6_Template, 2, 1);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_4_0;
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.exporting());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.exporting() ? 2 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loading() ? 5 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_4_0 = ctx.summary()) ? 6 : -1, tmp_4_0);
    }
  }, dependencies: [CommonModule, AppShellComponent, IconComponent, EmptyStateComponent, SkeletonRowsComponent, BarChartComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ReportsComponent, { className: "ReportsComponent", filePath: "src\\app\\features\\reports\\reports.component.ts", lineNumber: 115 });
})();
export {
  ReportsComponent
};
//# sourceMappingURL=chunk-XWJ2IYY3.js.map
