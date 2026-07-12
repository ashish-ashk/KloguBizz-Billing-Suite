import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel
} from "./chunk-I22U2CHU.js";
import {
  AppShellComponent
} from "./chunk-NTKKMEPP.js";
import "./chunk-XXTTC3T3.js";
import "./chunk-D76BFOPY.js";
import {
  AvatarComponent,
  EmptyStateComponent,
  ModalComponent,
  PillComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import {
  downloadBlob,
  fmtDate,
  fmtINR
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  RouterLink
} from "./chunk-AGABJEXX.js";
import {
  CommonModule,
  computed,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction1,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate2
} from "./chunk-KLA3EWNB.js";

// src/app/features/invoices/invoices.component.ts
var _forTrack0 = ($index, $item) => $item.key;
var _forTrack1 = ($index, $item) => $item._id;
var _c0 = (a0) => ["/invoices", a0, "edit"];
function InvoicesComponent_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 2);
  }
}
function InvoicesComponent_For_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 21);
    \u0275\u0275listener("click", function InvoicesComponent_For_11_Template_button_click_0_listener() {
      const f_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.filter.set(f_r2.key));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const f_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r2.filter() === f_r2.key);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", f_r2.label, " (", ctx_r2.countFor(f_r2.key), ") ");
  }
}
function InvoicesComponent_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 12);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 6);
  }
}
function InvoicesComponent_Conditional_18_For_24_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 39);
    \u0275\u0275listener("click", function InvoicesComponent_Conditional_18_For_24_Conditional_27_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const inv_r6 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.markPaid(inv_r6));
    });
    \u0275\u0275text(1, "\u2713 Paid");
    \u0275\u0275elementEnd();
  }
}
function InvoicesComponent_Conditional_18_For_24_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 2);
  }
}
function InvoicesComponent_Conditional_18_For_24_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2B07 ");
  }
}
function InvoicesComponent_Conditional_18_For_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td", 25);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td")(4, "div", 26);
    \u0275\u0275element(5, "app-avatar", 27);
    \u0275\u0275elementStart(6, "div")(7, "div", 28);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 29);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(11, "td", 30);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "td");
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "td", 30);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td", 30);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "td", 31);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "td");
    \u0275\u0275element(22, "app-pill", 32);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "td")(24, "div", 33)(25, "a", 34);
    \u0275\u0275text(26, "Edit");
    \u0275\u0275elementEnd();
    \u0275\u0275template(27, InvoicesComponent_Conditional_18_For_24_Conditional_27_Template, 2, 0, "button", 35);
    \u0275\u0275elementStart(28, "button", 36);
    \u0275\u0275listener("click", function InvoicesComponent_Conditional_18_For_24_Template_button_click_28_listener() {
      const inv_r6 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.downloadPdf(inv_r6));
    });
    \u0275\u0275template(29, InvoicesComponent_Conditional_18_For_24_Conditional_29_Template, 1, 0, "span", 2)(30, InvoicesComponent_Conditional_18_For_24_Conditional_30_Template, 1, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "button", 37);
    \u0275\u0275listener("click", function InvoicesComponent_Conditional_18_For_24_Template_button_click_31_listener() {
      const inv_r6 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.duplicate(inv_r6));
    });
    \u0275\u0275text(32, "\u29C9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "button", 38);
    \u0275\u0275listener("click", function InvoicesComponent_Conditional_18_For_24_Template_button_click_33_listener() {
      const inv_r6 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.confirmDelete.set(inv_r6));
    });
    \u0275\u0275text(34, "\u2715");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const inv_r6 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("row-danger", inv_r6.status === "overdue");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(inv_r6.invoiceNumber);
    \u0275\u0275advance(3);
    \u0275\u0275property("name", ctx_r2.clientName(inv_r6))("size", 28);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.clientName(inv_r6));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.clientGstin(inv_r6));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(inv_r6.date));
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", inv_r6.status === "overdue" ? "var(--red)" : "")("font-weight", inv_r6.status === "overdue" ? "700" : "");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r2.fmtDate(inv_r6.dueDate));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtINR(inv_r6.totals.subtotal));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtINR(ctx_r2.gstAmount(inv_r6)));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.fmtINR(inv_r6.totals.total));
    \u0275\u0275advance(2);
    \u0275\u0275property("status", inv_r6.status);
    \u0275\u0275advance(3);
    \u0275\u0275property("routerLink", \u0275\u0275pureFunction1(21, _c0, inv_r6._id));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(inv_r6.status !== "paid" ? 27 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r2.downloadingId() === inv_r6._id);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.downloadingId() === inv_r6._id ? 29 : 30);
  }
}
function InvoicesComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 13)(1, "table", 22)(2, "thead")(3, "tr")(4, "th");
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
    \u0275\u0275text(13, "Subtotal");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "GST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "th");
    \u0275\u0275text(17, "Total");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "th");
    \u0275\u0275text(19, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "th", 23);
    \u0275\u0275text(21, "Actions");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(22, "tbody");
    \u0275\u0275repeaterCreate(23, InvoicesComponent_Conditional_18_For_24_Template, 35, 23, "tr", 24, _forTrack1);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(23);
    \u0275\u0275repeater(ctx_r2.filtered());
  }
}
function InvoicesComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 14);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275property("message", ctx_r2.query() ? "Try a different search or filter." : "Create your first invoice to get started.");
  }
}
var InvoicesComponent = class _InvoicesComponent {
  api;
  toast;
  filters = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "pending", label: "Pending" },
    { key: "overdue", label: "Overdue" },
    { key: "draft", label: "Draft" }
  ];
  invoices = signal([]);
  loading = signal(true);
  busy = signal(false);
  exporting = signal(false);
  downloadingId = signal(null);
  filter = signal("all");
  query = signal("");
  confirmDelete = signal(null);
  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.invoices().filter((inv) => {
      const statusOk = this.filter() === "all" || inv.status === this.filter() || this.filter() === "pending" && inv.status === "partial";
      const text = `${inv.invoiceNumber} ${this.clientName(inv)}`.toLowerCase();
      return statusOk && (!q || text.includes(q));
    });
  });
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.load();
  }
  load() {
    this.api.invoices().subscribe({
      next: (list) => {
        this.invoices.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err, "Could not load invoices.");
      }
    });
  }
  countFor(key) {
    if (key === "all")
      return this.invoices().length;
    return this.invoices().filter((i) => i.status === key || key === "pending" && i.status === "partial").length;
  }
  clientName(inv) {
    return typeof inv.clientId === "string" ? "\u2014" : inv.clientId?.companyName || "\u2014";
  }
  clientGstin(inv) {
    return typeof inv.clientId === "string" ? "" : inv.clientId?.gstin || "";
  }
  gstAmount(inv) {
    return inv.totals.isIGST ? inv.totals.igst : inv.totals.cgst + inv.totals.sgst;
  }
  markPaid(inv) {
    this.api.markPaid(inv._id).subscribe({
      next: () => {
        this.toast.success(`${inv.invoiceNumber} marked as paid`);
        this.load();
      },
      error: (err) => this.toast.httpError(err)
    });
  }
  exportCsv() {
    this.exporting.set(true);
    this.api.exportInvoicesCsv().subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, "invoices.csv");
      },
      error: (err) => {
        this.exporting.set(false);
        this.toast.httpError(err);
      }
    });
  }
  downloadPdf(inv) {
    this.downloadingId.set(inv._id);
    this.api.downloadInvoicePdf(inv._id).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
        downloadBlob(blob, `${inv.invoiceNumber}.pdf`);
      },
      error: (err) => {
        this.downloadingId.set(null);
        this.toast.httpError(err, "Could not generate the PDF.");
      }
    });
  }
  duplicate(inv) {
    this.api.duplicateInvoice(inv._id).subscribe({
      next: (copy) => {
        this.toast.success(`Duplicated as ${copy.invoiceNumber} (draft)`);
        this.load();
      },
      error: (err) => this.toast.httpError(err)
    });
  }
  doDelete() {
    const inv = this.confirmDelete();
    if (!inv)
      return;
    this.busy.set(true);
    this.api.deleteInvoice(inv._id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmDelete.set(null);
        this.toast.info("Invoice deleted");
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function InvoicesComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InvoicesComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _InvoicesComponent, selectors: [["app-invoices"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 31, vars: 8, consts: [["title", "Invoices", 3, "subtitle"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], [1, "spinner"], ["actions", "", "routerLink", "/bill-generator", 1, "btn", "secondary"], ["actions", "", "routerLink", "/invoices/new", 1, "btn", "primary"], [1, "toolbar"], [1, "tabs"], ["type", "button", 3, "active"], [1, "search-box"], [1, "search-icon"], ["type", "search", "placeholder", "Search invoice or client\u2026", 1, "input", 3, "ngModelChange", "ngModel"], [1, "card", "flush"], [3, "count"], [1, "table-wrap"], ["icon", "\u25E7", "title", "No invoices found", 3, "message"], ["title", "Delete Invoice", 3, "close", "open"], [2, "margin", "0", "color", "var(--muted)", "line-height", "1.6"], [1, "mono", 2, "color", "var(--text)"], [1, "modal-foot"], ["type", "button", 1, "btn", "ghost", 3, "click"], ["type", "button", 1, "btn", "danger", "solid", 3, "click", "disabled"], ["type", "button", 3, "click"], [1, "table"], [2, "text-align", "right"], [3, "row-danger"], [1, "num"], [2, "display", "flex", "align-items", "center", "gap", "10px"], [3, "name", "size"], [2, "font-weight", "600"], [1, "muted", "mono", 2, "font-size", "11px"], [1, "muted"], [1, "strong"], [3, "status"], [1, "actions"], [1, "btn", "ghost", "sm", 3, "routerLink"], ["type", "button", 1, "btn", "success", "sm"], ["type", "button", "title", "Download PDF", 1, "btn", "ghost", "sm", 3, "click", "disabled"], ["type", "button", "title", "Duplicate", 1, "btn", "ghost", "sm", 3, "click"], ["type", "button", 1, "btn", "danger", "sm", 3, "click"], ["type", "button", 1, "btn", "success", "sm", 3, "click"]], template: function InvoicesComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0)(1, "button", 1);
      \u0275\u0275listener("click", function InvoicesComponent_Template_button_click_1_listener() {
        return ctx.exportCsv();
      });
      \u0275\u0275template(2, InvoicesComponent_Conditional_2_Template, 1, 0, "span", 2);
      \u0275\u0275text(3, " \u2B07 Export CSV ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "a", 3);
      \u0275\u0275text(5, "\u229E Bill Generator");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(6, "a", 4);
      \u0275\u0275text(7, "+ New Invoice");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "div", 5)(9, "div", 6);
      \u0275\u0275repeaterCreate(10, InvoicesComponent_For_11_Template, 2, 4, "button", 7, _forTrack0);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(12, "div", 8)(13, "span", 9);
      \u0275\u0275text(14, "\u2315");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(15, "input", 10);
      \u0275\u0275listener("ngModelChange", function InvoicesComponent_Template_input_ngModelChange_15_listener($event) {
        return ctx.query.set($event);
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(16, "section", 11);
      \u0275\u0275template(17, InvoicesComponent_Conditional_17_Template, 1, 1, "app-skeleton-rows", 12)(18, InvoicesComponent_Conditional_18_Template, 25, 0, "div", 13)(19, InvoicesComponent_Conditional_19_Template, 1, 1, "app-empty-state", 14);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(20, "app-modal", 15);
      \u0275\u0275listener("close", function InvoicesComponent_Template_app_modal_close_20_listener() {
        return ctx.confirmDelete.set(null);
      });
      \u0275\u0275elementStart(21, "p", 16);
      \u0275\u0275text(22, " Invoice ");
      \u0275\u0275elementStart(23, "strong", 17);
      \u0275\u0275text(24);
      \u0275\u0275elementEnd();
      \u0275\u0275text(25, " will be permanently deleted. This action cannot be undone. ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(26, "div", 18)(27, "button", 19);
      \u0275\u0275listener("click", function InvoicesComponent_Template_button_click_27_listener() {
        return ctx.confirmDelete.set(null);
      });
      \u0275\u0275text(28, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(29, "button", 20);
      \u0275\u0275listener("click", function InvoicesComponent_Template_button_click_29_listener() {
        return ctx.doDelete();
      });
      \u0275\u0275text(30, "Delete Invoice");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_7_0;
      \u0275\u0275property("subtitle", ctx.invoices().length + " total invoices");
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.exporting());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.exporting() ? 2 : -1);
      \u0275\u0275advance(8);
      \u0275\u0275repeater(ctx.filters);
      \u0275\u0275advance(5);
      \u0275\u0275property("ngModel", ctx.query());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loading() ? 17 : ctx.filtered().length ? 18 : 19);
      \u0275\u0275advance(3);
      \u0275\u0275property("open", !!ctx.confirmDelete());
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate((tmp_7_0 = ctx.confirmDelete()) == null ? null : tmp_7_0.invoiceNumber);
      \u0275\u0275advance(5);
      \u0275\u0275property("disabled", ctx.busy());
    }
  }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, NgControlStatus, NgModel, RouterLink, AppShellComponent, PillComponent, AvatarComponent, EmptyStateComponent, ModalComponent, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InvoicesComponent, { className: "InvoicesComponent", filePath: "src\\app\\features\\invoices\\invoices.component.ts", lineNumber: 110 });
})();
export {
  InvoicesComponent
};
//# sourceMappingURL=chunk-HMTFAOOE.js.map
