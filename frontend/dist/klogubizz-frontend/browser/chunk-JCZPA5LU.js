import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  NumberValueAccessor,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-I22U2CHU.js";
import {
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import {
  fmtDate
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  CommonModule,
  __objRest,
  __spreadProps,
  __spreadValues,
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
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-KLA3EWNB.js";

// src/app/features/super-admin/plans.component.ts
var _forTrack0 = ($index, $item) => $item.code;
var _forTrack1 = ($index, $item) => $item._id;
function SuperPlansComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 1);
    \u0275\u0275element(1, "app-skeleton-rows", 2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 5);
  }
}
function SuperPlansComponent_Conditional_7_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 4)(1, "div", 16)(2, "div", 17)(3, "div", 18);
    \u0275\u0275text(4, "\u{1F4B3}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div")(6, "div", 19);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 20);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(10, "label", 21)(11, "input", 22);
    \u0275\u0275twoWayListener("ngModelChange", function SuperPlansComponent_Conditional_7_For_2_Template_input_ngModelChange_11_listener($event) {
      const p_r3 = \u0275\u0275restoreView(_r2).$implicit;
      \u0275\u0275twoWayBindingSet(p_r3.active, $event) || (p_r3.active = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(12, "span", 23);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 24)(14, "div", 9)(15, "label");
    \u0275\u0275text(16, "Monthly Price \u20B9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "input", 25);
    \u0275\u0275twoWayListener("ngModelChange", function SuperPlansComponent_Conditional_7_For_2_Template_input_ngModelChange_17_listener($event) {
      const p_r3 = \u0275\u0275restoreView(_r2).$implicit;
      \u0275\u0275twoWayBindingSet(p_r3.monthlyPrice, $event) || (p_r3.monthlyPrice = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "div", 9)(19, "label");
    \u0275\u0275text(20, "Yearly Price \u20B9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "input", 25);
    \u0275\u0275twoWayListener("ngModelChange", function SuperPlansComponent_Conditional_7_For_2_Template_input_ngModelChange_21_listener($event) {
      const p_r3 = \u0275\u0275restoreView(_r2).$implicit;
      \u0275\u0275twoWayBindingSet(p_r3.yearlyPrice, $event) || (p_r3.yearlyPrice = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(22, "div", 9)(23, "label");
    \u0275\u0275text(24, "Max Users");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "input", 25);
    \u0275\u0275twoWayListener("ngModelChange", function SuperPlansComponent_Conditional_7_For_2_Template_input_ngModelChange_25_listener($event) {
      const p_r3 = \u0275\u0275restoreView(_r2).$implicit;
      \u0275\u0275twoWayBindingSet(p_r3.userLimit, $event) || (p_r3.userLimit = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div", 9)(27, "label");
    \u0275\u0275text(28, "Max Invoices / month");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "input", 25);
    \u0275\u0275twoWayListener("ngModelChange", function SuperPlansComponent_Conditional_7_For_2_Template_input_ngModelChange_29_listener($event) {
      const p_r3 = \u0275\u0275restoreView(_r2).$implicit;
      \u0275\u0275twoWayBindingSet(p_r3.invoiceLimit, $event) || (p_r3.invoiceLimit = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(30, "div", 26)(31, "label");
    \u0275\u0275text(32, "Features (one per line)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "textarea", 27);
    \u0275\u0275twoWayListener("ngModelChange", function SuperPlansComponent_Conditional_7_For_2_Template_textarea_ngModelChange_33_listener($event) {
      const p_r3 = \u0275\u0275restoreView(_r2).$implicit;
      \u0275\u0275twoWayBindingSet(p_r3.featuresText, $event) || (p_r3.featuresText = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(34, "div", 28)(35, "button", 29);
    \u0275\u0275listener("click", function SuperPlansComponent_Conditional_7_For_2_Template_button_click_35_listener() {
      const p_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.savePlan(p_r3));
    });
    \u0275\u0275text(36, "Save Plan");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const p_r3 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(p_r3.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(p_r3.code);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", p_r3.active);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", p_r3.monthlyPrice);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", p_r3.yearlyPrice);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", p_r3.userLimit);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", p_r3.invoiceLimit);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", p_r3.featuresText);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r3.saving());
  }
}
function SuperPlansComponent_Conditional_7_For_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 12);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const o_r5 = ctx.$implicit;
    \u0275\u0275property("value", o_r5._id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(o_r5.name);
  }
}
function SuperPlansComponent_Conditional_7_For_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 12);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const p_r6 = ctx.$implicit;
    \u0275\u0275property("value", p_r6.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(p_r6.name);
  }
}
function SuperPlansComponent_Conditional_7_Conditional_32_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 30)(1, "div", 31)(2, "div", 32);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 33);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "button", 34);
    \u0275\u0275listener("click", function SuperPlansComponent_Conditional_7_Conditional_32_For_2_Template_button_click_6_listener() {
      const o_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r3.activate(o_r8));
    });
    \u0275\u0275text(7, "Activate");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const o_r8 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(o_r8.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", o_r8.plan, " \xB7 joined ", ctx_r3.fmtDate(o_r8.createdAt), "");
  }
}
function SuperPlansComponent_Conditional_7_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 14);
    \u0275\u0275repeaterCreate(1, SuperPlansComponent_Conditional_7_Conditional_32_For_2_Template, 8, 3, "div", 30, _forTrack1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r3.trialOrgs());
  }
}
function SuperPlansComponent_Conditional_7_Conditional_33_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 15);
    \u0275\u0275text(1, "\u2713 No organizations on trial");
    \u0275\u0275elementEnd();
  }
}
function SuperPlansComponent_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 3);
    \u0275\u0275repeaterCreate(1, SuperPlansComponent_Conditional_7_For_2_Template, 37, 9, "section", 4, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 5)(4, "section", 4)(5, "div", 6);
    \u0275\u0275text(6, "Organization Plan Override");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 7);
    \u0275\u0275text(8, "Assign a plan to a specific organization");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 8)(10, "div", 9)(11, "label");
    \u0275\u0275text(12, "Organization");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "select", 10);
    \u0275\u0275twoWayListener("ngModelChange", function SuperPlansComponent_Conditional_7_Template_select_ngModelChange_13_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.overrideOrgId, $event) || (ctx_r3.overrideOrgId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(14, "option", 11);
    \u0275\u0275text(15, "Select organization\u2026");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(16, SuperPlansComponent_Conditional_7_For_17_Template, 2, 2, "option", 12, _forTrack1);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "div", 9)(19, "label");
    \u0275\u0275text(20, "Assign Plan");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "select", 10);
    \u0275\u0275twoWayListener("ngModelChange", function SuperPlansComponent_Conditional_7_Template_select_ngModelChange_21_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r3.overridePlan, $event) || (ctx_r3.overridePlan = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(22, SuperPlansComponent_Conditional_7_For_23_Template, 2, 2, "option", 12, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(24, "div")(25, "button", 13);
    \u0275\u0275listener("click", function SuperPlansComponent_Conditional_7_Template_button_click_25_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.applyOverride());
    });
    \u0275\u0275text(26, "Apply Override");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(27, "section", 4)(28, "div", 6);
    \u0275\u0275text(29, "Trial Organizations");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "div", 7);
    \u0275\u0275text(31, "Tenants that have not activated a paid plan yet");
    \u0275\u0275elementEnd();
    \u0275\u0275template(32, SuperPlansComponent_Conditional_7_Conditional_32_Template, 3, 0, "div", 14)(33, SuperPlansComponent_Conditional_7_Conditional_33_Template, 2, 0, "div", 15);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r3.plans());
    \u0275\u0275advance(12);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.overrideOrgId);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r3.orgs());
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r3.overridePlan);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r3.plans());
    \u0275\u0275advance(10);
    \u0275\u0275conditional(ctx_r3.trialOrgs().length ? 32 : 33);
  }
}
var SuperPlansComponent = class _SuperPlansComponent {
  api;
  toast;
  loading = signal(true);
  saving = signal(false);
  plans = signal([]);
  orgs = signal([]);
  trialOrgs = signal([]);
  overrideOrgId = "";
  overridePlan = "starter";
  fmtDate = fmtDate;
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.load();
  }
  load() {
    forkJoin({ plans: this.api.superPlans(), orgs: this.api.superOrganisations() }).subscribe({
      next: ({ plans, orgs }) => {
        this.plans.set(plans.map((p) => __spreadProps(__spreadValues({}, p), { featuresText: (p.features || []).join("\n") })));
        this.orgs.set(orgs);
        this.trialOrgs.set(orgs.filter((o) => o.status === "trial"));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
  }
  savePlan(p) {
    this.saving.set(true);
    const _a = p, { featuresText, _id } = _a, rest = __objRest(_a, ["featuresText", "_id"]);
    this.api.superSavePlan(p.code, __spreadProps(__spreadValues({}, rest), {
      features: featuresText.split("\n").map((f) => f.trim()).filter(Boolean)
    })).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(`${p.name} plan saved`);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  applyOverride() {
    if (!this.overrideOrgId) {
      this.toast.error("Select an organization first.");
      return;
    }
    this.api.superUpdateOrganisation(this.overrideOrgId, { plan: this.overridePlan }).subscribe({
      next: (org) => {
        this.toast.success(`${org.name} moved to ${this.overridePlan}`);
        this.load();
      },
      error: (err) => this.toast.httpError(err)
    });
  }
  activate(o) {
    this.api.superUpdateOrganisation(o._id, { status: "active" }).subscribe({
      next: () => {
        this.toast.success(`${o.name} activated`);
        this.load();
      },
      error: (err) => this.toast.httpError(err)
    });
  }
  static \u0275fac = function SuperPlansComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SuperPlansComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuperPlansComponent, selectors: [["app-super-plans"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 8, vars: 1, consts: [[1, "page-head"], [1, "card", "flush"], [3, "count"], [1, "grid", "grid-2", 2, "margin-bottom", "16px"], [1, "card"], [1, "grid", "grid-2"], [1, "card-title", 2, "margin-bottom", "4px"], [1, "card-sub", 2, "margin-bottom", "16px"], [1, "form"], [1, "field"], [3, "ngModelChange", "ngModel"], ["value", "", "disabled", ""], [3, "value"], ["type", "button", 1, "btn", "primary", "sm", 3, "click"], [2, "display", "grid", "gap", "10px"], [1, "info-box", "ok"], [1, "card-head"], [2, "display", "flex", "align-items", "center", "gap", "10px"], [2, "width", "36px", "height", "36px", "border-radius", "9px", "background", "var(--brand-pale)", "display", "grid", "place-items", "center", "font-size", "15px"], [1, "card-title"], [1, "card-sub", "mono"], [1, "switch"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [1, "track"], [1, "grid", "grid-2", 2, "gap", "12px"], ["type", "number", 3, "ngModelChange", "ngModel"], [1, "field", 2, "margin-top", "12px"], ["rows", "4", 3, "ngModelChange", "ngModel"], [2, "display", "flex", "justify-content", "flex-end", "margin-top", "12px"], ["type", "button", 1, "btn", "primary", "sm", 3, "click", "disabled"], [2, "display", "flex", "align-items", "center", "gap", "12px", "border", "1px solid var(--amber-border)", "background", "var(--amber-bg)", "border-radius", "10px", "padding", "10px 14px"], [2, "flex", "1"], [2, "font-weight", "700", "font-size", "13px"], [2, "font-size", "11.5px", "color", "var(--muted)"], ["type", "button", 1, "btn", "success", "sm", 3, "click"]], template: function SuperPlansComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div")(2, "h1");
      \u0275\u0275text(3, "Subscription Plans");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "p");
      \u0275\u0275text(5, "Pricing and limits for every tier");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(6, SuperPlansComponent_Conditional_6_Template, 2, 1, "div", 1)(7, SuperPlansComponent_Conditional_7_Template, 34, 3);
    }
    if (rf & 2) {
      \u0275\u0275advance(6);
      \u0275\u0275conditional(ctx.loading() ? 6 : 7);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuperPlansComponent, { className: "SuperPlansComponent", filePath: "src\\app\\features\\super-admin\\plans.component.ts", lineNumber: 105 });
})();
export {
  SuperPlansComponent
};
//# sourceMappingURL=chunk-JCZPA5LU.js.map
