import {
  SkeletonRowsComponent,
  ToastService
} from "./chunk-OBVHAWX5.js";
import "./chunk-7F65RAZH.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-XAFCZYPI.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
import {
  CommonModule,
  __spreadProps,
  __spreadValues,
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
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-6VNHH65J.js";

// src/app/features/super-admin/templates.component.ts
var _forTrack0 = ($index, $item) => $item._id;
var _forTrack1 = ($index, $item) => $item.key;
function SuperTemplatesComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 3);
    \u0275\u0275element(1, "app-skeleton-rows", 5);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 5);
  }
}
function SuperTemplatesComponent_Conditional_10_For_9_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 39);
    \u0275\u0275text(1, "Default");
    \u0275\u0275elementEnd();
  }
}
function SuperTemplatesComponent_Conditional_10_For_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 31);
    \u0275\u0275listener("click", function SuperTemplatesComponent_Conditional_10_For_9_Template_button_click_0_listener() {
      const t_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.selected.set(t_r3._id));
    });
    \u0275\u0275elementStart(1, "div", 32)(2, "div", 33);
    \u0275\u0275text(3, "TAX INVOICE");
    \u0275\u0275elementEnd();
    \u0275\u0275element(4, "div", 34)(5, "div", 35)(6, "div", 36);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 37)(8, "div")(9, "div", 38);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 27);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(13, SuperTemplatesComponent_Conditional_10_For_9_Conditional_13_Template, 2, 0, "span", 39);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const t_r3 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275styleProp("border", ctx_r3.selected() === t_r3._id ? "2px solid var(--brand)" : "2px solid var(--border)");
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", "linear-gradient(135deg," + t_r3.accentColor + ",var(--sidebar-from))");
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(t_r3.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", t_r3.layout, " layout");
    \u0275\u0275advance();
    \u0275\u0275conditional(t_r3.isDefault ? 13 : -1);
  }
}
function SuperTemplatesComponent_Conditional_10_For_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 16)(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 40)(4, "input", 41);
    \u0275\u0275twoWayListener("ngModelChange", function SuperTemplatesComponent_Conditional_10_For_18_Template_input_ngModelChange_4_listener($event) {
      const opt_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r3.config[opt_r6.key], $event) || (ctx_r3.config[opt_r6.key] = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(5, "span", 42);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const opt_r6 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(opt_r6.label);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.config[opt_r6.key]);
  }
}
function SuperTemplatesComponent_Conditional_10_For_60_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 43);
    \u0275\u0275listener("click", function SuperTemplatesComponent_Conditional_10_For_60_Template_button_click_0_listener() {
      const c_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.config.accentColor = c_r8);
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r8 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275styleProp("background", c_r8)("outline", ctx_r3.config.accentColor === c_r8 ? "2px solid var(--text)" : "none");
  }
}
function SuperTemplatesComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 4)(1, "div", 6)(2, "section", 7)(3, "div", 8);
    \u0275\u0275text(4, "Select Template");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 9);
    \u0275\u0275text(6, "The default template applies to every new invoice");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 10);
    \u0275\u0275repeaterCreate(8, SuperTemplatesComponent_Conditional_10_For_9_Template, 14, 7, "button", 11, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 12)(11, "button", 13);
    \u0275\u0275listener("click", function SuperTemplatesComponent_Conditional_10_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.setDefault());
    });
    \u0275\u0275text(12, "Set as Default");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(13, "section", 7)(14, "div", 14);
    \u0275\u0275text(15, "Invoice Content Settings");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "div", 15);
    \u0275\u0275repeaterCreate(17, SuperTemplatesComponent_Conditional_10_For_18_Template, 6, 2, "label", 16, _forTrack1);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(19, "div", 6)(20, "section", 7)(21, "div", 14);
    \u0275\u0275text(22, "Format Settings");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 17)(24, "div", 18)(25, "label");
    \u0275\u0275text(26, "Paper Size");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "select", 19);
    \u0275\u0275twoWayListener("ngModelChange", function SuperTemplatesComponent_Conditional_10_Template_select_ngModelChange_27_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.config.paperSize, $event) || (ctx_r3.config.paperSize = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(28, "option");
    \u0275\u0275text(29, "A4");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "option");
    \u0275\u0275text(31, "Letter");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "option");
    \u0275\u0275text(33, "Legal");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(34, "div", 18)(35, "label");
    \u0275\u0275text(36, "Font Size");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "select", 19);
    \u0275\u0275twoWayListener("ngModelChange", function SuperTemplatesComponent_Conditional_10_Template_select_ngModelChange_37_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.config.fontSize, $event) || (ctx_r3.config.fontSize = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(38, "option", 20);
    \u0275\u0275text(39, "Small");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(40, "option", 21);
    \u0275\u0275text(41, "Medium");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "option", 22);
    \u0275\u0275text(43, "Large");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(44, "div", 18)(45, "label");
    \u0275\u0275text(46, "Draft Watermark Text");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "input", 23);
    \u0275\u0275twoWayListener("ngModelChange", function SuperTemplatesComponent_Conditional_10_Template_input_ngModelChange_47_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.config.watermark, $event) || (ctx_r3.config.watermark = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(48, "section", 7)(49, "div", 14);
    \u0275\u0275text(50, "Accent Color");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "div", 24)(52, "input", 25);
    \u0275\u0275twoWayListener("ngModelChange", function SuperTemplatesComponent_Conditional_10_Template_input_ngModelChange_52_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.config.accentColor, $event) || (ctx_r3.config.accentColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "div")(54, "div", 26);
    \u0275\u0275text(55);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(56, "div", 27);
    \u0275\u0275text(57, "Custom brand color");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(58, "div", 28);
    \u0275\u0275repeaterCreate(59, SuperTemplatesComponent_Conditional_10_For_60_Template, 1, 4, "button", 29, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(61, "div", 30);
    \u0275\u0275text(62, " These template settings apply globally across all organizations. Individual organizations can override the accent color from their own branding settings. ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275repeater(ctx_r3.templates());
    \u0275\u0275advance(3);
    \u0275\u0275property("disabled", !ctx_r3.selected() || ctx_r3.saving());
    \u0275\u0275advance(6);
    \u0275\u0275repeater(ctx_r3.contentOptions);
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.config.paperSize);
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.config.fontSize);
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.config.watermark);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.config.accentColor);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r3.config.accentColor);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r3.presets);
  }
}
var SuperTemplatesComponent = class _SuperTemplatesComponent {
  api;
  toast;
  loading = signal(true);
  saving = signal(false);
  templates = signal([]);
  selected = signal("");
  presets = ["#4F46E5", "#0F172A", "#059669", "#D97706", "#DC2626", "#7C3AED", "#2563EB", "#0891B2"];
  contentOptions = [
    { key: "showLogo", label: "Show Company Logo" },
    { key: "showSignature", label: "Authorised Signature" },
    { key: "showBankDetails", label: "Bank Details Section" },
    { key: "showAmountInWords", label: "Amount in Words" },
    { key: "showGstBreakdown", label: "GST Rate Breakdown" },
    { key: "showQrCode", label: "QR Code for Payment" }
  ];
  config = {
    paperSize: "A4",
    fontSize: "medium",
    watermark: "DRAFT",
    accentColor: "#4F46E5",
    showLogo: true,
    showSignature: true,
    showBankDetails: true,
    showAmountInWords: true,
    showGstBreakdown: true,
    showQrCode: false
  };
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.api.superMasters().subscribe({
      next: (res) => {
        this.templates.set(res.templates);
        const def = res.templates.find((t) => t.isDefault) || res.templates[0];
        if (def)
          this.selected.set(def._id);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
    this.api.superSettings().subscribe({
      next: (settings) => {
        if (settings["templateConfig"])
          this.config = __spreadValues(__spreadValues({}, this.config), settings["templateConfig"]);
      }
    });
  }
  setDefault() {
    const id = this.selected();
    if (!id)
      return;
    this.saving.set(true);
    this.api.superUpdateTemplate(id, { isDefault: true }).subscribe({
      next: (t) => {
        this.saving.set(false);
        this.templates.update((list) => list.map((x) => __spreadProps(__spreadValues({}, x), { isDefault: x._id === t._id })));
        this.toast.success(`${t.name} is now the default template`);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  saveConfig() {
    this.saving.set(true);
    this.api.superSaveSetting("templateConfig", this.config).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success("Template settings saved");
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function SuperTemplatesComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SuperTemplatesComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuperTemplatesComponent, selectors: [["app-super-templates"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 11, vars: 2, consts: [[1, "page-head"], [1, "page-actions"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "card", "flush"], [1, "grid", "grid-wide"], [3, "count"], [2, "display", "grid", "gap", "16px", "align-content", "start"], [1, "card"], [1, "card-title", 2, "margin-bottom", "4px"], [1, "card-sub", 2, "margin-bottom", "16px"], [1, "grid", "grid-2"], ["type", "button", 2, "border-radius", "12px", "padding", "0", "overflow", "hidden", "background", "var(--card)", "cursor", "pointer", "text-align", "left", "transition", "all .15s", 3, "border"], [2, "margin-top", "14px"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click", "disabled"], [1, "card-title", 2, "margin-bottom", "14px"], [1, "grid", "grid-2", 2, "gap", "12px"], [1, "checkbox", 2, "justify-content", "space-between", "border", "1px solid var(--border)", "border-radius", "9px", "padding", "10px 14px"], [1, "form"], [1, "field"], [3, "ngModelChange", "ngModel"], ["value", "small"], ["value", "medium"], ["value", "large"], ["placeholder", "DRAFT", 3, "ngModelChange", "ngModel"], [2, "display", "flex", "align-items", "center", "gap", "12px", "margin-bottom", "14px"], ["type", "color", 2, "width", "44px", "height", "44px", "border", "1px solid var(--border)", "border-radius", "8px", "padding", "2px", "cursor", "pointer", "background", "var(--card)", 3, "ngModelChange", "ngModel"], [1, "mono", 2, "font-weight", "700", "font-size", "13px"], [2, "font-size", "11px", "color", "var(--muted)"], [2, "display", "flex", "gap", "8px", "flex-wrap", "wrap"], ["type", "button", 2, "width", "28px", "height", "28px", "border-radius", "7px", "border", "2px solid var(--card)", "box-shadow", "0 1px 4px rgba(0,0,0,.2)", "cursor", "pointer", 3, "background", "outline"], [1, "info-box"], ["type", "button", 2, "border-radius", "12px", "padding", "0", "overflow", "hidden", "background", "var(--card)", "cursor", "pointer", "text-align", "left", "transition", "all .15s", 3, "click"], [2, "height", "90px", "padding", "12px", "display", "flex", "flex-direction", "column", "gap", "6px"], [2, "color", "#fff", "font-size", "10px", "font-weight", "800", "letter-spacing", "1px"], [2, "height", "5px", "width", "70%", "background", "rgba(255,255,255,.5)", "border-radius", "3px"], [2, "height", "5px", "width", "50%", "background", "rgba(255,255,255,.35)", "border-radius", "3px"], [2, "height", "5px", "width", "60%", "background", "rgba(255,255,255,.25)", "border-radius", "3px"], [2, "padding", "10px 12px", "display", "flex", "align-items", "center", "justify-content", "space-between"], [2, "font-weight", "700", "font-size", "13px"], [1, "pill"], [1, "switch"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [1, "track"], ["type", "button", 2, "width", "28px", "height", "28px", "border-radius", "7px", "border", "2px solid var(--card)", "box-shadow", "0 1px 4px rgba(0,0,0,.2)", "cursor", "pointer", 3, "click"]], template: function SuperTemplatesComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div")(2, "h1");
      \u0275\u0275text(3, "Invoice Templates");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "p");
      \u0275\u0275text(5, "Control how invoices look across the platform");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(6, "div", 1)(7, "button", 2);
      \u0275\u0275listener("click", function SuperTemplatesComponent_Template_button_click_7_listener() {
        return ctx.saveConfig();
      });
      \u0275\u0275text(8, "Save Template Settings");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(9, SuperTemplatesComponent_Conditional_9_Template, 2, 1, "div", 3)(10, SuperTemplatesComponent_Conditional_10_Template, 63, 6, "div", 4);
    }
    if (rf & 2) {
      \u0275\u0275advance(7);
      \u0275\u0275property("disabled", ctx.saving());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loading() ? 9 : 10);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuperTemplatesComponent, { className: "SuperTemplatesComponent", filePath: "src\\app\\features\\super-admin\\templates.component.ts", lineNumber: 125 });
})();
export {
  SuperTemplatesComponent
};
//# sourceMappingURL=chunk-K2D4OD4S.js.map
