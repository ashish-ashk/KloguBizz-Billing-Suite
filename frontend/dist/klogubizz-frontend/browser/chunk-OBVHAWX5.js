import {
  avatarColor,
  initials
} from "./chunk-7F65RAZH.js";
import {
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-XAFCZYPI.js";
import {
  CommonModule,
  EventEmitter,
  computed,
  input,
  signal,
  ɵsetClassDebugInfo,
  ɵɵNgOnChangesFeature,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtextInterpolate3
} from "./chunk-6VNHH65J.js";

// src/app/core/toast.service.ts
var ToastService = class _ToastService {
  toasts = signal([]);
  nextId = 1;
  show(msg, type = "success", duration = 3200) {
    const toast = { id: this.nextId++, msg, type };
    this.toasts.update((list) => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), duration);
  }
  success(msg) {
    this.show(msg, "success");
  }
  info(msg) {
    this.show(msg, "info");
  }
  error(msg) {
    this.show(msg, "error", 4500);
  }
  /** Extracts a readable message from an HttpErrorResponse. */
  httpError(err, fallback = "Something went wrong. Please try again.") {
    const e = err;
    this.error(e?.error?.message || fallback);
  }
  dismiss(id) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
  static \u0275fac = function ToastService_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ToastService)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ToastService, factory: _ToastService.\u0275fac, providedIn: "root" });
};

// src/app/shared/ui.ts
var _forTrack0 = ($index, $item) => $item.id;
function ToastsComponent_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 2);
    \u0275\u0275listener("click", function ToastsComponent_For_2_Template_div_click_0_listener() {
      const t_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.toast.dismiss(t_r2.id));
    });
    \u0275\u0275elementStart(1, "span", 3);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 4);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const t_r2 = ctx.$implicit;
    \u0275\u0275classProp("info", t_r2.type === "info")("error", t_r2.type === "error");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(t_r2.type === "success" ? "\u2713" : t_r2.type === "error" ? "!" : "i");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(t_r2.msg);
  }
}
var _c0 = ["*"];
function ModalComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 1);
    \u0275\u0275listener("click", function ModalComponent_Conditional_0_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.close.emit());
    });
    \u0275\u0275elementStart(1, "div", 2);
    \u0275\u0275listener("click", function ModalComponent_Conditional_0_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r1);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "div", 3)(3, "div", 4)(4, "div", 5);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 6);
    \u0275\u0275listener("click", function ModalComponent_Conditional_0_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.close.emit());
    });
    \u0275\u0275text(7, "\u2715");
    \u0275\u0275elementEnd()();
    \u0275\u0275projection(8);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", ctx_r1.width, "px");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.title);
  }
}
function SkeletonRowsComponent_For_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 0);
  }
}
function PagerComponent_Conditional_0_For_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 4);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r3 = ctx.$implicit;
    \u0275\u0275property("ngValue", s_r3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", s_r3, " / page");
  }
}
function PagerComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 2)(4, "select", 3);
    \u0275\u0275listener("ngModelChange", function PagerComponent_Conditional_0_Template_select_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.pageSizeChange.emit($event));
    });
    \u0275\u0275repeaterCreate(5, PagerComponent_Conditional_0_For_6_Template, 2, 2, "option", 4, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 5);
    \u0275\u0275listener("click", function PagerComponent_Conditional_0_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.pageChange.emit(ctx_r1.page - 1));
    });
    \u0275\u0275text(8, "\u2039 Prev");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 6);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 5);
    \u0275\u0275listener("click", function PagerComponent_Conditional_0_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.pageChange.emit(ctx_r1.page + 1));
    });
    \u0275\u0275text(12, "Next \u203A");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate3("Showing ", ctx_r1.startIndex + 1, "\u2013", ctx_r1.endIndex, " of ", ctx_r1.total, "");
    \u0275\u0275advance(2);
    \u0275\u0275property("ngModel", ctx_r1.pageSize);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.pageSizeOptions);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r1.page <= 1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2("Page ", ctx_r1.page, " of ", ctx_r1.totalPages, "");
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.page >= ctx_r1.totalPages);
  }
}
var ToastsComponent = class _ToastsComponent {
  toast;
  constructor(toast) {
    this.toast = toast;
  }
  static \u0275fac = function ToastsComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ToastsComponent)(\u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ToastsComponent, selectors: [["app-toasts"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 3, vars: 0, consts: [[1, "toast-region", "no-print"], [1, "toast", 3, "info", "error"], [1, "toast", 3, "click"], [1, "t-icon"], [1, "t-msg"]], template: function ToastsComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0);
      \u0275\u0275repeaterCreate(1, ToastsComponent_For_2_Template, 5, 6, "div", 1, _forTrack0);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.toast.toasts());
    }
  }, dependencies: [CommonModule], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ToastsComponent, { className: "ToastsComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 23 });
})();
var openModalCount = 0;
var ModalComponent = class _ModalComponent {
  open = false;
  title = "";
  width = 480;
  close = new EventEmitter();
  // Locks page scroll behind the overlay while any modal is open. A counter
  // (rather than a plain boolean) so two modals opening in quick succession
  // — e.g. a confirm dialog over a form — don't have the first one's close
  // unlock scroll while the second is still up.
  ngOnChanges(changes) {
    if (!changes["open"])
      return;
    const wasOpen = !!changes["open"].previousValue;
    const isOpen = !!changes["open"].currentValue;
    if (isOpen === wasOpen)
      return;
    openModalCount = Math.max(0, openModalCount + (isOpen ? 1 : -1));
    document.body.style.overflow = openModalCount > 0 ? "hidden" : "";
  }
  ngOnDestroy() {
    if (this.open) {
      openModalCount = Math.max(0, openModalCount - 1);
      document.body.style.overflow = openModalCount > 0 ? "hidden" : "";
    }
  }
  static \u0275fac = function ModalComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ModalComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ModalComponent, selectors: [["app-modal"]], inputs: { open: "open", title: "title", width: "width" }, outputs: { close: "close" }, standalone: true, features: [\u0275\u0275NgOnChangesFeature, \u0275\u0275StandaloneFeature], ngContentSelectors: _c0, decls: 1, vars: 1, consts: [[1, "modal-overlay", "no-print"], [1, "modal-overlay", "no-print", 3, "click"], [1, "modal-panel", 3, "click"], [1, "modal-scroll"], [1, "modal-head"], [1, "modal-title"], ["type", "button", "aria-label", "Close", 1, "modal-close", 3, "click"]], template: function ModalComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef();
      \u0275\u0275template(0, ModalComponent_Conditional_0_Template, 9, 3, "div", 0);
    }
    if (rf & 2) {
      \u0275\u0275conditional(ctx.open ? 0 : -1);
    }
  }, dependencies: [CommonModule], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ModalComponent, { className: "ModalComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 50 });
})();
var PillComponent = class _PillComponent {
  status = "draft";
  label = "";
  get defaultLabel() {
    const map = {
      paid: "Paid",
      pending: "Pending",
      overdue: "Overdue",
      draft: "Draft",
      partial: "Partial",
      active: "Active",
      trial: "Trial",
      suspended: "Suspended",
      cancelled: "Cancelled",
      invited: "Invited",
      disabled: "Disabled",
      success: "Success",
      failed: "Failed",
      admin: "Admin",
      accountant: "Accountant",
      viewer: "Viewer",
      inactive: "Inactive"
    };
    return map[this.status] || this.status;
  }
  static \u0275fac = function PillComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _PillComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _PillComponent, selectors: [["app-pill"]], inputs: { status: "status", label: "label" }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 3, vars: 3, consts: [[1, "pill"], [1, "dot"]], template: function PillComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "span", 0);
      \u0275\u0275element(1, "span", 1);
      \u0275\u0275text(2);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275classMap("pill " + ctx.status);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.label || ctx.defaultLabel);
    }
  }, encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(PillComponent, { className: "PillComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 83 });
})();
var AvatarComponent = class _AvatarComponent {
  name = input("");
  size = 32;
  colors = computed(() => avatarColor(this.name()));
  text = computed(() => initials(this.name()));
  static \u0275fac = function AvatarComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AvatarComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AvatarComponent, selectors: [["app-avatar"]], inputs: { name: [1, "name"], size: "size" }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 2, vars: 11, consts: [[1, "avatar"]], template: function AvatarComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "span", 0);
      \u0275\u0275text(1);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275styleProp("width", ctx.size, "px")("height", ctx.size, "px")("font-size", ctx.size * 0.36, "px")("background", ctx.colors().bg)("color", ctx.colors().color);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate(ctx.text());
    }
  }, encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AvatarComponent, { className: "AvatarComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 108 });
})();
var EmptyStateComponent = class _EmptyStateComponent {
  icon = "\u25E7";
  title = "Nothing here yet";
  message = "";
  static \u0275fac = function EmptyStateComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _EmptyStateComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _EmptyStateComponent, selectors: [["app-empty-state"]], inputs: { icon: "icon", title: "title", message: "message" }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 8, vars: 3, consts: [[1, "empty-state"], [1, "es-icon-ring"], [1, "es-icon"], [1, "es-title"]], template: function EmptyStateComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2);
      \u0275\u0275text(3);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(4, "div", 3);
      \u0275\u0275text(5);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(6, "div");
      \u0275\u0275text(7);
      \u0275\u0275elementEnd()();
    }
    if (rf & 2) {
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate(ctx.icon);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.title);
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.message);
    }
  }, encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(EmptyStateComponent, { className: "EmptyStateComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 127 });
})();
var SkeletonRowsComponent = class _SkeletonRowsComponent {
  count = 4;
  rows = () => Array.from({ length: this.count });
  static \u0275fac = function SkeletonRowsComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SkeletonRowsComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SkeletonRowsComponent, selectors: [["app-skeleton-rows"]], inputs: { count: "count" }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 2, vars: 0, consts: [[1, "skeleton", 2, "height", "44px", "margin", "10px 16px"]], template: function SkeletonRowsComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275repeaterCreate(0, SkeletonRowsComponent_For_1_Template, 1, 0, "div", 0, \u0275\u0275repeaterTrackByIndex);
    }
    if (rf & 2) {
      \u0275\u0275repeater(ctx.rows());
    }
  }, encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SkeletonRowsComponent, { className: "SkeletonRowsComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 143 });
})();
var PagerComponent = class _PagerComponent {
  page = 1;
  pageSize = 10;
  total = 0;
  pageSizeOptions = [10, 25, 50, 100];
  pageChange = new EventEmitter();
  pageSizeChange = new EventEmitter();
  get totalPages() {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
  get startIndex() {
    return this.total === 0 ? 0 : (this.page - 1) * this.pageSize;
  }
  get endIndex() {
    return Math.min(this.total, this.page * this.pageSize);
  }
  static \u0275fac = function PagerComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _PagerComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _PagerComponent, selectors: [["app-pager"]], inputs: { page: "page", pageSize: "pageSize", total: "total", pageSizeOptions: "pageSizeOptions" }, outputs: { pageChange: "pageChange", pageSizeChange: "pageSizeChange" }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 1, vars: 1, consts: [[1, "pager"], [1, "pager-info"], [1, "pager-controls"], [1, "pager-size", 3, "ngModelChange", "ngModel"], [3, "ngValue"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click", "disabled"], [1, "pager-page"]], template: function PagerComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275template(0, PagerComponent_Conditional_0_Template, 13, 8, "div", 0);
    }
    if (rf & 2) {
      \u0275\u0275conditional(ctx.total > 0 ? 0 : -1);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, SelectControlValueAccessor, NgControlStatus, NgModel], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(PagerComponent, { className: "PagerComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 169 });
})();

export {
  ToastService,
  ToastsComponent,
  ModalComponent,
  PillComponent,
  AvatarComponent,
  EmptyStateComponent,
  SkeletonRowsComponent,
  PagerComponent
};
//# sourceMappingURL=chunk-OBVHAWX5.js.map
