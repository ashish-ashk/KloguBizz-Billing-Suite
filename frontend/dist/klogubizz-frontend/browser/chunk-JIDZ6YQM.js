import {
  avatarColor,
  initials
} from "./chunk-ECR3SCST.js";
import {
  CommonModule,
  EventEmitter,
  computed,
  input,
  signal,
  ɵsetClassDebugInfo,
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
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate
} from "./chunk-KLA3EWNB.js";

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
    \u0275\u0275elementStart(2, "div", 3)(3, "div", 4);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 5);
    \u0275\u0275listener("click", function ModalComponent_Conditional_0_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.close.emit());
    });
    \u0275\u0275text(6, "\u2715");
    \u0275\u0275elementEnd()();
    \u0275\u0275projection(7);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", ctx_r1.width, "px");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.title);
  }
}
function SkeletonRowsComponent_For_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 0);
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
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ToastsComponent, { className: "ToastsComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 22 });
})();
var ModalComponent = class _ModalComponent {
  open = false;
  title = "";
  width = 480;
  close = new EventEmitter();
  static \u0275fac = function ModalComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ModalComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ModalComponent, selectors: [["app-modal"]], inputs: { open: "open", title: "title", width: "width" }, outputs: { close: "close" }, standalone: true, features: [\u0275\u0275StandaloneFeature], ngContentSelectors: _c0, decls: 1, vars: 1, consts: [[1, "modal-overlay", "no-print"], [1, "modal-overlay", "no-print", 3, "click"], [1, "modal-panel", 3, "click"], [1, "modal-head"], [1, "modal-title"], ["type", "button", "aria-label", "Close", 1, "modal-close", 3, "click"]], template: function ModalComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275projectionDef();
      \u0275\u0275template(0, ModalComponent_Conditional_0_Template, 8, 3, "div", 0);
    }
    if (rf & 2) {
      \u0275\u0275conditional(ctx.open ? 0 : -1);
    }
  }, dependencies: [CommonModule], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ModalComponent, { className: "ModalComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 45 });
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
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(PillComponent, { className: "PillComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 58 });
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
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AvatarComponent, { className: "AvatarComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 83 });
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
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(EmptyStateComponent, { className: "EmptyStateComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 102 });
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
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SkeletonRowsComponent, { className: "SkeletonRowsComponent", filePath: "src\\app\\shared\\ui.ts", lineNumber: 118 });
})();

export {
  ToastService,
  ToastsComponent,
  ModalComponent,
  PillComponent,
  AvatarComponent,
  EmptyStateComponent,
  SkeletonRowsComponent
};
//# sourceMappingURL=chunk-JIDZ6YQM.js.map
