import {
  AppShellComponent
} from "./chunk-NTKKMEPP.js";
import "./chunk-XXTTC3T3.js";
import "./chunk-D76BFOPY.js";
import {
  EmptyStateComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import {
  downloadBlob,
  fmtINR,
  monthLabel
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import "./chunk-AGABJEXX.js";
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
} from "./chunk-KLA3EWNB.js";

// src/app/features/reports/reports.component.ts
var _forTrack0 = ($index, $item) => $item.month;
var _forTrack1 = ($index, $item) => $item.rate;
function ReportsComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 2);
  }
}
function ReportsComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 3);
    \u0275\u0275element(1, "app-skeleton-rows", 4);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 6);
  }
}
function ReportsComponent_Conditional_5_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 3);
    \u0275\u0275element(1, "app-empty-state", 5);
    \u0275\u0275elementEnd();
  }
}
function ReportsComponent_Conditional_5_Conditional_1_For_61_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 24);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 25);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td", 25);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "td", 25);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td", 25);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "td", 26);
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
function ReportsComponent_Conditional_5_Conditional_1_For_81_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td")(2, "span", 27);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "td");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "td", 24);
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
function ReportsComponent_Conditional_5_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "section", 6)(1, "div", 7);
    \u0275\u0275element(2, "div", 8);
    \u0275\u0275elementStart(3, "div", 9)(4, "span", 10);
    \u0275\u0275text(5, "Taxable Value");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 11);
    \u0275\u0275text(7, "\u20B9");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 12);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 13);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 7);
    \u0275\u0275element(13, "div", 14);
    \u0275\u0275elementStart(14, "div", 9)(15, "span", 10);
    \u0275\u0275text(16, "Tax Collected");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span", 11);
    \u0275\u0275text(18, "\u25C8");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(19, "div", 15);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 13);
    \u0275\u0275text(22, "CGST + SGST + IGST combined");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "div", 7);
    \u0275\u0275element(24, "div", 16);
    \u0275\u0275elementStart(25, "div", 9)(26, "span", 10);
    \u0275\u0275text(27, "Total Billed");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "span", 11);
    \u0275\u0275text(29, "\u25E7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 17);
    \u0275\u0275text(31);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "div", 13);
    \u0275\u0275text(33, "Taxable value + tax");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(34, "section", 18)(35, "div", 19)(36, "div")(37, "div", 20);
    \u0275\u0275text(38, "GST Summary by Month");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(39, "div", 21);
    \u0275\u0275text(40, "For GSTR filing \u2014 draft invoices excluded");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(41, "div", 22)(42, "table", 23)(43, "thead")(44, "tr")(45, "th");
    \u0275\u0275text(46, "Month");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "th");
    \u0275\u0275text(48, "Invoices");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "th");
    \u0275\u0275text(50, "Taxable Value");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "th");
    \u0275\u0275text(52, "CGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "th");
    \u0275\u0275text(54, "SGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(55, "th");
    \u0275\u0275text(56, "IGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(57, "th");
    \u0275\u0275text(58, "Total");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(59, "tbody");
    \u0275\u0275repeaterCreate(60, ReportsComponent_Conditional_5_Conditional_1_For_61_Template, 15, 8, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(62, "section", 3)(63, "div", 19)(64, "div")(65, "div", 20);
    \u0275\u0275text(66, "GST Rate Breakdown");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(67, "div", 21);
    \u0275\u0275text(68, "Taxable value and tax collected per GST slab");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(69, "div", 22)(70, "table", 23)(71, "thead")(72, "tr")(73, "th");
    \u0275\u0275text(74, "Rate");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(75, "th");
    \u0275\u0275text(76, "Taxable Value");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(77, "th");
    \u0275\u0275text(78, "Tax Collected");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(79, "tbody");
    \u0275\u0275repeaterCreate(80, ReportsComponent_Conditional_5_Conditional_1_For_81_Template, 8, 3, "tr", null, _forTrack1);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const s_r4 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(s_r4.totals.taxable, true));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("Across ", s_r4.totals.invoiceCount, " issued invoice", s_r4.totals.invoiceCount === 1 ? "" : "s", "");
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(s_r4.totals.tax, true));
    \u0275\u0275advance(11);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(s_r4.totals.taxable + s_r4.totals.tax, true));
    \u0275\u0275advance(29);
    \u0275\u0275repeater(s_r4.byMonth);
    \u0275\u0275advance(20);
    \u0275\u0275repeater(s_r4.byRate);
  }
}
function ReportsComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, ReportsComponent_Conditional_5_Conditional_0_Template, 2, 0, "div", 3)(1, ReportsComponent_Conditional_5_Conditional_1_Template, 82, 5);
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
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ReportsComponent, selectors: [["app-reports"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 6, vars: 4, consts: [["title", "Reports", "subtitle", "GST filing summary and revenue insights, straight from your issued invoices"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], [1, "spinner"], [1, "card", "flush"], [3, "count"], ["icon", "\u25E7", "title", "No issued invoices yet", "message", "Draft invoices are excluded \u2014 create and send your first invoice to see reports here."], [1, "grid", "grid-3", 2, "margin-bottom", "20px"], [1, "card", "metric"], [1, "accent", 2, "background", "var(--brand)"], [1, "metric-row"], [1, "label"], [1, "m-icon"], [1, "value"], [1, "sub"], [1, "accent", 2, "background", "var(--purple)"], [1, "value", 2, "color", "var(--purple)"], [1, "accent", 2, "background", "var(--green)"], [1, "value", 2, "color", "var(--green)"], [1, "card", "flush", 2, "margin-bottom", "20px"], [1, "card-head"], [1, "card-title"], [1, "card-sub"], [1, "table-wrap"], [1, "table"], [1, "strong"], [1, "muted"], [1, "num"], [1, "pill"]], template: function ReportsComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0)(1, "button", 1);
      \u0275\u0275listener("click", function ReportsComponent_Template_button_click_1_listener() {
        return ctx.exportCsv();
      });
      \u0275\u0275template(2, ReportsComponent_Conditional_2_Template, 1, 0, "span", 2);
      \u0275\u0275text(3, " \u2B07 Export Monthly CSV ");
      \u0275\u0275elementEnd();
      \u0275\u0275template(4, ReportsComponent_Conditional_4_Template, 2, 1, "div", 3)(5, ReportsComponent_Conditional_5_Template, 2, 1);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_3_0;
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.exporting());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.exporting() ? 2 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loading() ? 4 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_3_0 = ctx.summary()) ? 5 : -1, tmp_3_0);
    }
  }, dependencies: [CommonModule, AppShellComponent, EmptyStateComponent, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ReportsComponent, { className: "ReportsComponent", filePath: "src\\app\\features\\reports\\reports.component.ts", lineNumber: 106 });
})();
export {
  ReportsComponent
};
//# sourceMappingURL=chunk-J7YLOTX3.js.map
