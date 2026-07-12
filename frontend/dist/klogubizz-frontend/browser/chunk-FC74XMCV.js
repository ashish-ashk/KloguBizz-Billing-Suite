import {
  AppShellComponent
} from "./chunk-NTKKMEPP.js";
import "./chunk-XXTTC3T3.js";
import "./chunk-D76BFOPY.js";
import {
  AvatarComponent,
  EmptyStateComponent,
  PillComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import {
  fmtDate,
  fmtINR,
  monthLabel
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  RouterLink
} from "./chunk-AGABJEXX.js";
import {
  CommonModule,
  forkJoin,
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
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction1,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate3
} from "./chunk-KLA3EWNB.js";

// src/app/features/dashboard/dashboard.component.ts
var _forTrack0 = ($index, $item) => $item.month;
var _forTrack1 = ($index, $item) => $item.name;
var _forTrack2 = ($index, $item) => $item._id;
var _c0 = (a0) => ["/invoices", a0, "edit"];
function DashboardComponent_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 2);
    \u0275\u0275element(1, "app-skeleton-rows", 3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 6);
  }
}
function DashboardComponent_Conditional_4_Conditional_51_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 31);
    \u0275\u0275element(1, "div", 32);
    \u0275\u0275elementStart(2, "div", 33);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const m_r1 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", ctx_r1.barHeight(m_r1.revenue), "%");
    \u0275\u0275property("title", ctx_r1.fmtINR(m_r1.revenue));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.monthLabel(m_r1.month));
  }
}
function DashboardComponent_Conditional_4_Conditional_51_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275repeaterCreate(1, DashboardComponent_Conditional_4_Conditional_51_For_2_Template, 4, 4, "div", 31, _forTrack0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(s_r3.monthlyRevenue);
  }
}
function DashboardComponent_Conditional_4_Conditional_52_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 23);
  }
}
function DashboardComponent_Conditional_4_Conditional_58_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div")(1, "div", 34)(2, "span", 35);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 36);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275element(6, "div", 37);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(c_r4.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(c_r4.revenue, true));
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", ctx_r1.hbarWidth(c_r4.revenue), "%");
  }
}
function DashboardComponent_Conditional_4_Conditional_58_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24);
    \u0275\u0275repeaterCreate(1, DashboardComponent_Conditional_4_Conditional_58_For_2_Template, 7, 4, "div", null, _forTrack1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(s_r3.topClients);
  }
}
function DashboardComponent_Conditional_4_Conditional_59_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 25);
  }
}
function DashboardComponent_Conditional_4_Conditional_69_For_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 39);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td")(4, "div", 40);
    \u0275\u0275element(5, "app-avatar", 41);
    \u0275\u0275elementStart(6, "span", 42);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(8, "td", 43);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "td", 43);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "td", 44);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "td");
    \u0275\u0275element(15, "app-pill", 45);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "td", 46)(17, "a", 47);
    \u0275\u0275text(18, "Edit");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const inv_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(inv_r5.invoiceNumber);
    \u0275\u0275advance(3);
    \u0275\u0275property("name", ctx_r1.clientName(inv_r5))("size", 28);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.clientName(inv_r5));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtDate(inv_r5.date));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtDate(inv_r5.dueDate));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(inv_r5.totals.total));
    \u0275\u0275advance(2);
    \u0275\u0275property("status", inv_r5.status);
    \u0275\u0275advance(2);
    \u0275\u0275property("routerLink", \u0275\u0275pureFunction1(9, _c0, inv_r5._id));
  }
}
function DashboardComponent_Conditional_4_Conditional_69_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29)(1, "table", 38)(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Invoice #");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Client");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Due Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th");
    \u0275\u0275text(13, "Amount");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275element(16, "th");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "tbody");
    \u0275\u0275repeaterCreate(18, DashboardComponent_Conditional_4_Conditional_69_For_19_Template, 19, 11, "tr", null, _forTrack2);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(18);
    \u0275\u0275repeater(ctx_r1.recent());
  }
}
function DashboardComponent_Conditional_4_Conditional_70_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 30);
  }
}
function DashboardComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "section", 4)(1, "div", 5);
    \u0275\u0275element(2, "div", 6);
    \u0275\u0275elementStart(3, "div", 7)(4, "span", 8);
    \u0275\u0275text(5, "Total Revenue");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 9);
    \u0275\u0275text(7, "\u20B9");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 10);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 11);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 5);
    \u0275\u0275element(13, "div", 12);
    \u0275\u0275elementStart(14, "div", 7)(15, "span", 8);
    \u0275\u0275text(16, "Pending");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span", 9);
    \u0275\u0275text(18, "\u23F3");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(19, "div", 10);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 13);
    \u0275\u0275text(22);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "div", 5);
    \u0275\u0275element(24, "div", 14);
    \u0275\u0275elementStart(25, "div", 7)(26, "span", 8);
    \u0275\u0275text(27, "Overdue");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "span", 9);
    \u0275\u0275text(29, "\u26A0");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 10);
    \u0275\u0275text(31);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "div", 15);
    \u0275\u0275text(33);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(34, "div", 5);
    \u0275\u0275element(35, "div", 16);
    \u0275\u0275elementStart(36, "div", 7)(37, "span", 8);
    \u0275\u0275text(38, "Total Invoices");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(39, "span", 9);
    \u0275\u0275text(40, "\u25E7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(41, "div", 10);
    \u0275\u0275text(42);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "div", 17);
    \u0275\u0275text(44);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(45, "section", 18)(46, "div", 19)(47, "div", 20);
    \u0275\u0275text(48, "Monthly Revenue");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "div", 21);
    \u0275\u0275text(50);
    \u0275\u0275elementEnd();
    \u0275\u0275template(51, DashboardComponent_Conditional_4_Conditional_51_Template, 3, 0, "div", 22)(52, DashboardComponent_Conditional_4_Conditional_52_Template, 1, 0, "app-empty-state", 23);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "div", 19)(54, "div", 20);
    \u0275\u0275text(55, "Top Clients");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(56, "div", 21);
    \u0275\u0275text(57, "By collected revenue");
    \u0275\u0275elementEnd();
    \u0275\u0275template(58, DashboardComponent_Conditional_4_Conditional_58_Template, 3, 0, "div", 24)(59, DashboardComponent_Conditional_4_Conditional_59_Template, 1, 0, "app-empty-state", 25);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(60, "section", 2)(61, "div", 26)(62, "div")(63, "div", 20);
    \u0275\u0275text(64, "Recent Invoices");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(65, "div", 27);
    \u0275\u0275text(66, "Latest billing activity");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(67, "a", 28);
    \u0275\u0275text(68, "View all \u2192");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(69, DashboardComponent_Conditional_4_Conditional_69_Template, 20, 0, "div", 29)(70, DashboardComponent_Conditional_4_Conditional_70_Template, 1, 0, "app-empty-state", 30);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r3 = ctx;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(s_r3.totalRevenue, true));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", s_r3.counts.paid, " paid invoices");
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(s_r3.pendingAmount, true));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", s_r3.counts.pending, " awaiting payment");
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(ctx_r1.fmtINR(s_r3.overdueAmount, true));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", s_r3.counts.overdue, " require attention");
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(s_r3.counts.total);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate3("", s_r3.counts.paid, " paid \xB7 ", s_r3.counts.pending, " pending \xB7 ", s_r3.counts.draft, " draft");
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate1("Collections over the last ", s_r3.monthlyRevenue.length, " months");
    \u0275\u0275advance();
    \u0275\u0275conditional(s_r3.monthlyRevenue.length ? 51 : 52);
    \u0275\u0275advance(7);
    \u0275\u0275conditional(s_r3.topClients.length ? 58 : 59);
    \u0275\u0275advance(11);
    \u0275\u0275conditional(ctx_r1.recent().length ? 69 : 70);
  }
}
var DashboardComponent = class _DashboardComponent {
  api;
  toast;
  loading = signal(true);
  stats = signal(null);
  recent = signal([]);
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  monthLabel = monthLabel;
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    forkJoin({ stats: this.api.invoiceStats(), invoices: this.api.invoices() }).subscribe({
      next: ({ stats, invoices }) => {
        this.stats.set(stats);
        this.recent.set(invoices.slice(0, 6));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err, "Could not load the dashboard.");
      }
    });
  }
  maxMonth() {
    return Math.max(...this.stats()?.monthlyRevenue.map((m) => m.revenue) || [0], 1);
  }
  maxClient() {
    return Math.max(...this.stats()?.topClients.map((c) => c.revenue) || [0], 1);
  }
  barHeight(v) {
    return Math.max(3, Math.round(v / this.maxMonth() * 100));
  }
  hbarWidth(v) {
    return Math.max(4, Math.round(v / this.maxClient() * 100));
  }
  clientName(inv) {
    return typeof inv.clientId === "string" ? "\u2014" : inv.clientId?.companyName || "\u2014";
  }
  static \u0275fac = function DashboardComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _DashboardComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _DashboardComponent, selectors: [["app-dashboard"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 5, vars: 2, consts: [["title", "Dashboard", "subtitle", "Here's your billing overview for today"], ["actions", "", "routerLink", "/invoices/new", 1, "btn", "primary"], [1, "card", "flush"], [3, "count"], [1, "grid", "grid-4", 2, "margin-bottom", "20px"], [1, "card", "metric", "hoverable"], [1, "accent", 2, "background", "linear-gradient(90deg,var(--brand),var(--brand-light))"], [1, "metric-row"], [1, "label"], [1, "m-icon"], [1, "value"], [1, "sub", 2, "color", "var(--green)"], [1, "accent", 2, "background", "var(--amber)"], [1, "sub", 2, "color", "var(--amber)"], [1, "accent", 2, "background", "var(--red)"], [1, "sub", 2, "color", "var(--red)"], [1, "accent", 2, "background", "var(--purple)"], [1, "sub"], [1, "grid", "grid-wide", 2, "margin-bottom", "20px"], [1, "card"], [1, "card-title"], [1, "card-sub", 2, "margin-bottom", "18px"], [1, "bar-chart"], ["icon", "\u25A4", "title", "No revenue yet", "message", "Paid invoices will chart here month by month."], [2, "display", "grid", "gap", "14px"], ["icon", "\u25EB", "title", "No client revenue yet", "message", "Top paying clients appear here."], [1, "card-head"], [1, "card-sub"], ["routerLink", "/invoices", 1, "btn", "ghost", "sm"], [1, "table-wrap"], ["icon", "\u25E7", "title", "No invoices yet", "message", "Create your first invoice to get started."], [1, "bar-col"], [1, "bar", 3, "title"], [1, "bar-label"], [2, "display", "flex", "justify-content", "space-between", "margin-bottom", "5px"], [2, "font-weight", "600", "font-size", "12.5px"], [2, "font-weight", "700", "font-size", "12.5px", "color", "var(--brand)"], [1, "hbar"], [1, "table"], [1, "num"], [2, "display", "flex", "align-items", "center", "gap", "10px"], [3, "name", "size"], [2, "font-weight", "600"], [1, "muted"], [1, "strong"], [3, "status"], [1, "actions"], [1, "btn", "ghost", "sm", 3, "routerLink"]], template: function DashboardComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0)(1, "a", 1);
      \u0275\u0275text(2, "+ New Invoice");
      \u0275\u0275elementEnd();
      \u0275\u0275template(3, DashboardComponent_Conditional_3_Template, 2, 1, "div", 2)(4, DashboardComponent_Conditional_4_Template, 71, 14);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      let tmp_1_0;
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.loading() ? 3 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_1_0 = ctx.stats()) ? 4 : -1, tmp_1_0);
    }
  }, dependencies: [CommonModule, RouterLink, AppShellComponent, PillComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(DashboardComponent, { className: "DashboardComponent", filePath: "src\\app\\features\\dashboard\\dashboard.component.ts", lineNumber: 134 });
})();
export {
  DashboardComponent
};
//# sourceMappingURL=chunk-FC74XMCV.js.map
