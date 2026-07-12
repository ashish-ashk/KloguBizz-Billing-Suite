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
import {
  PRESET_THEMES,
  TENANT_ROLES,
  ThemeService,
  getPreset,
  resolvePalette
} from "./chunk-D76BFOPY.js";
import {
  ToastService
} from "./chunk-JIDZ6YQM.js";
import "./chunk-ECR3SCST.js";
import "./chunk-RP5ZW4FD.js";
import {
  AuthService,
  RouterLink
} from "./chunk-AGABJEXX.js";
import {
  CommonModule,
  __spreadProps,
  __spreadValues,
  computed,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassMap,
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
  ɵɵtextInterpolate2
} from "./chunk-KLA3EWNB.js";

// src/app/features/appearance/appearance.component.ts
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.name;
function AppearanceComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 3);
  }
}
function AppearanceComponent_For_18_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 61);
  }
}
function AppearanceComponent_For_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 29);
    \u0275\u0275listener("click", function AppearanceComponent_For_18_Template_button_click_0_listener() {
      const role_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selectRole(role_r2));
    });
    \u0275\u0275text(1);
    \u0275\u0275template(2, AppearanceComponent_For_18_Conditional_2_Template, 1, 0, "span", 61);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const role_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r2.selectedRole() === role_r2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.roleMeta[role_r2].label, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r2.isDefaultRoleConfig(role_r2) ? 2 : -1);
  }
}
function AppearanceComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 62);
    \u0275\u0275listener("click", function AppearanceComponent_Conditional_19_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.toggleDarkForRole());
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", ctx_r2.previewIsDark() ? "\u2600 Switch to Light" : "\u{1F319} Switch to Dark", " for ", ctx_r2.roleMeta[ctx_r2.selectedRole()].label, " ");
  }
}
function AppearanceComponent_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 10);
    \u0275\u0275text(1, " \u{1F512} Dark mode toggle is a Business plan feature \u2014 ");
    \u0275\u0275elementStart(2, "strong");
    \u0275\u0275text(3, "Upgrade to unlock");
    \u0275\u0275elementEnd()();
  }
}
function AppearanceComponent_For_36_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 64);
    \u0275\u0275text(1, "Current");
    \u0275\u0275elementEnd();
  }
}
function AppearanceComponent_For_36_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 63);
    \u0275\u0275listener("click", function AppearanceComponent_For_36_Template_button_click_0_listener() {
      const t_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selectPreset(t_r6.id));
    });
    \u0275\u0275template(1, AppearanceComponent_For_36_Conditional_1_Template, 2, 0, "span", 64);
    \u0275\u0275elementStart(2, "span", 65);
    \u0275\u0275element(3, "span")(4, "span")(5, "span");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 66)(7, "span", 67);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 32);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const t_r6 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("selected", ctx_r2.mode() === "preset" && ctx_r2.selectedPreset() === t_r6.id);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.savedByRole()[ctx_r2.selectedRole()].presetId === t_r6.id && !ctx_r2.savedByRole()[ctx_r2.selectedRole()].custom ? 1 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("background", t_r6.secondary);
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", t_r6.primary);
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", t_r6.accent);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(t_r6.name);
    \u0275\u0275advance();
    \u0275\u0275classMap(t_r6.mode === "dark" ? "draft" : "active");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(t_r6.mode === "dark" ? "\u{1F319} Dark" : "\u2600 Light");
  }
}
function AppearanceComponent_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 21);
    \u0275\u0275text(1, "\u2713 Currently Active");
    \u0275\u0275elementEnd();
  }
}
function AppearanceComponent_Conditional_78_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 23)(1, "label");
    \u0275\u0275text(2, "Background Color");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 24)(4, "input", 25);
    \u0275\u0275listener("ngModelChange", function AppearanceComponent_Conditional_78_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setCustom("background", $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "input", 26);
    \u0275\u0275listener("ngModelChange", function AppearanceComponent_Conditional_78_Template_input_ngModelChange_5_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setCustom("background", $event));
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(6, "div", 23)(7, "label");
    \u0275\u0275text(8, "Text Color");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 24)(10, "input", 25);
    \u0275\u0275listener("ngModelChange", function AppearanceComponent_Conditional_78_Template_input_ngModelChange_10_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setCustom("text", $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "input", 26);
    \u0275\u0275listener("ngModelChange", function AppearanceComponent_Conditional_78_Template_input_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setCustom("text", $event));
    });
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275property("ngModel", ctx_r2.custom().background);
    \u0275\u0275advance();
    \u0275\u0275property("ngModel", ctx_r2.custom().background);
    \u0275\u0275advance(5);
    \u0275\u0275property("ngModel", ctx_r2.custom().text);
    \u0275\u0275advance();
    \u0275\u0275property("ngModel", ctx_r2.custom().text);
  }
}
function AppearanceComponent_For_94_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 68);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r8 = ctx.$implicit;
    const \u0275$index_214_r9 = ctx.$index;
    \u0275\u0275styleProp("background", \u0275$index_214_r9 === 0 ? "linear-gradient(135deg,rgba(99,102,241,.35),rgba(79,70,229,.2))" : "transparent")("color", \u0275$index_214_r9 === 0 ? "#c7d2fe" : "rgba(200,200,255,.65)");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(item_r8);
  }
}
function AppearanceComponent_For_128_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 69)(1, "span", 70);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 55);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 56)(6, "span", 71);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const row_r10 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", ctx_r2.previewVars()["--card"])("border-top", "1px solid " + ctx_r2.previewVars()["--border"]);
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r2.previewVars()["--brand"]);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(row_r10.num);
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r2.previewVars()["--text"]);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(row_r10.name);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("background", row_r10.status === "paid" ? ctx_r2.previewVars()["--green-bg"] : ctx_r2.previewVars()["--amber-bg"])("color", row_r10.status === "paid" ? ctx_r2.previewVars()["--green"] : ctx_r2.previewVars()["--amber"]);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(row_r10.status);
  }
}
var DEFAULT_CUSTOM = {
  primary: "#4f46e5",
  secondary: "#312e81",
  accent: "#818cf8",
  background: "#ffffff",
  text: "#1e1b4b",
  mode: "light"
};
var DEFAULT_ROLE_CONFIG = { presetId: "indigo", custom: null };
var ROLE_META = {
  admin: { label: "Admin", description: "Full access to every module" },
  accountant: { label: "Accountant", description: "Invoicing, payments and reports" },
  viewer: { label: "Viewer", description: "Read-only access" }
};
var AppearanceComponent = class _AppearanceComponent {
  auth;
  themeService;
  toast;
  presets = PRESET_THEMES;
  roles = TENANT_ROLES;
  roleMeta = ROLE_META;
  previewNav = ["Dashboard", "Invoices", "Payments", "Reports"];
  previewRows = [
    { num: "KLG-001", name: "Acme Corp", status: "paid" },
    { num: "KLG-002", name: "Reliance Tech", status: "pending" }
  ];
  selectedRole = signal("admin");
  mode = signal("preset");
  selectedPreset = signal("indigo");
  custom = signal(__spreadValues({}, DEFAULT_CUSTOM));
  savedByRole = signal({
    admin: __spreadValues({}, DEFAULT_ROLE_CONFIG),
    accountant: __spreadValues({}, DEFAULT_ROLE_CONFIG),
    viewer: __spreadValues({}, DEFAULT_ROLE_CONFIG)
  });
  saving = signal(false);
  currentConfig = computed(() => this.mode() === "custom" ? { presetId: this.selectedPreset(), custom: this.custom() } : { presetId: this.selectedPreset(), custom: null });
  // Single source of truth for the preview panel: resolves whichever mode
  // (preset or custom) is currently active, exactly like ThemeService does
  // for the real app chrome — so the two never disagree.
  previewVars = computed(() => resolvePalette(this.currentConfig()));
  selectedPresetName = computed(() => getPreset(this.selectedPreset()).name);
  previewIsDark = computed(() => this.mode() === "custom" ? this.custom().mode === "dark" : getPreset(this.selectedPreset()).mode === "dark");
  dirty = computed(() => JSON.stringify(this.currentConfig()) !== JSON.stringify(this.savedByRole()[this.selectedRole()]));
  constructor(auth, themeService, toast) {
    this.auth = auth;
    this.themeService = themeService;
    this.toast = toast;
  }
  isBusinessPlan() {
    return ["business", "enterprise"].includes(this.auth.organisation()?.plan || "");
  }
  isDefaultRoleConfig(role) {
    const c = this.savedByRole()[role];
    return !c || c.presetId === "indigo" && !c.custom;
  }
  ngOnInit() {
    const orgConfig = this.auth.organisation()?.themeConfig || {};
    const byRole = {};
    for (const role of this.roles) {
      byRole[role] = orgConfig[role] || __spreadValues({}, DEFAULT_ROLE_CONFIG);
    }
    this.savedByRole.set(byRole);
    this.loadRoleIntoBuilder("admin");
  }
  ngOnDestroy() {
    if (this.dirty())
      this.themeService.revertPreview();
  }
  loadRoleIntoBuilder(role) {
    const config = this.savedByRole()[role];
    if (config.custom) {
      this.mode.set("custom");
      this.custom.set(__spreadValues({}, config.custom));
    } else {
      this.mode.set("preset");
      this.selectedPreset.set(config.presetId || "indigo");
    }
  }
  selectRole(role) {
    this.selectedRole.set(role);
    this.loadRoleIntoBuilder(role);
    this.themeService.preview(this.currentConfig());
  }
  selectPreset(id) {
    this.mode.set("preset");
    this.selectedPreset.set(id);
    this.themeService.preview(this.currentConfig());
  }
  setCustom(key, value) {
    this.mode.set("custom");
    this.custom.update((c) => __spreadProps(__spreadValues({}, c), { [key]: value }));
    this.themeService.preview(this.currentConfig());
  }
  /** One-click: convert whatever is currently selected into its dark/light equivalent. */
  toggleDarkForRole() {
    if (!this.isBusinessPlan())
      return;
    const seed = this.mode() === "custom" ? this.custom() : getPreset(this.selectedPreset());
    const nextMode = seed.mode === "dark" ? "light" : "dark";
    this.mode.set("custom");
    this.custom.set({
      primary: seed.primary,
      secondary: seed.secondary,
      accent: seed.accent,
      background: nextMode === "dark" ? "#111827" : "#ffffff",
      text: nextMode === "dark" ? "#f1f5f9" : "#1e1b4b",
      mode: nextMode
    });
    this.themeService.preview(this.currentConfig());
  }
  discard() {
    this.loadRoleIntoBuilder(this.selectedRole());
    this.themeService.revertPreview();
  }
  save() {
    const role = this.selectedRole();
    this.saving.set(true);
    this.themeService.save(role, this.currentConfig()).subscribe({
      next: () => {
        this.saving.set(false);
        this.savedByRole.update((map) => __spreadProps(__spreadValues({}, map), { [role]: this.currentConfig() }));
        this.toast.success(`Theme saved for ${this.roleMeta[role].label}s`);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function AppearanceComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AppearanceComponent)(\u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ThemeService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AppearanceComponent, selectors: [["app-appearance"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 136, vars: 78, consts: [["title", "Appearance", "subtitle", "Customize how Klogu Bizz looks for each role in your organization"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], ["actions", "", "type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], [1, "info-box", 2, "margin-bottom", "20px"], [1, "card", 2, "margin-bottom", "20px"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "gap", "16px", "flex-wrap", "wrap"], [1, "tabs"], ["type", "button", 3, "active"], ["type", "button", 1, "btn", "secondary", "sm"], ["routerLink", "/subscription", 1, "info-box", "warn", 2, "margin", "0", "text-decoration", "none"], [1, "card-sub", 2, "margin-top", "10px"], [1, "appearance-layout"], [2, "display", "grid", "gap", "20px"], [1, "card"], [1, "card-head"], [1, "card-title"], [1, "card-sub"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], [1, "grid", "grid-3", 2, "gap", "12px"], ["type", "button", 1, "theme-card", 3, "selected"], [1, "pill", "active"], [1, "grid", "grid-2", 2, "gap", "14px"], [1, "field"], [1, "color-field"], ["type", "color", 3, "ngModelChange", "ngModel"], [1, "mono", 3, "ngModelChange", "ngModel"], [1, "hint"], [1, "tabs", 2, "width", "fit-content"], ["type", "button", 3, "click"], [2, "position", "sticky", "top", "20px"], [1, "card-sub", 2, "margin-bottom", "10px", "display", "flex", "justify-content", "space-between", "align-items", "center"], [1, "pill"], [1, "preview-frame", 2, "padding", "0", "overflow", "hidden"], [2, "display", "flex", "min-height", "400px"], [2, "width", "118px", "flex-shrink", "0", "padding", "14px 9px"], [2, "display", "flex", "align-items", "center", "gap", "6px", "margin-bottom", "16px"], [2, "width", "20px", "height", "20px", "border-radius", "6px", "display", "grid", "place-items", "center", "font-size", "10px", "font-weight", "800", "color", "#fff", "flex-shrink", "0"], [2, "color", "#fff", "font-size", "9.5px", "font-weight", "800"], [2, "padding", "6px 8px", "border-radius", "6px", "font-size", "9px", "margin-bottom", "3px", "font-weight", "600", 3, "background", "color"], [2, "flex", "1", "min-width", "0"], [2, "height", "28px", "display", "flex", "align-items", "center", "justify-content", "flex-end", "padding", "0 12px", "gap", "7px"], [2, "width", "18px", "height", "18px", "border-radius", "50%", "display", "grid", "place-items", "center", "font-size", "8.5px"], [2, "width", "18px", "height", "18px", "border-radius", "50%"], [2, "padding", "12px"], [2, "display", "inline-flex", "gap", "2px", "padding", "2px", "border-radius", "6px", "margin-bottom", "10px"], [2, "padding", "3px 9px", "border-radius", "5px", "font-size", "9px", "font-weight", "700"], [2, "padding", "3px 9px", "font-size", "9px", "font-weight", "600"], [2, "display", "grid", "grid-template-columns", "1fr 1fr", "gap", "8px", "margin-bottom", "10px"], [2, "border-radius", "8px", "padding", "8px 10px"], [2, "font-size", "8px", "text-transform", "uppercase", "font-weight", "700", "letter-spacing", ".4px"], [2, "font-size", "13px", "font-weight", "800", "margin-top", "3px"], [2, "border-radius", "8px", "overflow", "hidden"], [2, "display", "flex", "padding", "6px 10px", "font-size", "7.5px", "font-weight", "700", "text-transform", "uppercase", "letter-spacing", ".3px"], [2, "flex", "1"], [2, "flex", "1.4"], [2, "width", "48px", "text-align", "right"], [2, "display", "flex", "align-items", "center", "padding", "6px 10px", "font-size", "9px", 3, "background", "borderTop"], [2, "display", "flex", "gap", "6px", "margin-top", "10px", "flex-wrap", "wrap"], [2, "padding", "5px 12px", "border-radius", "6px", "font-size", "9px", "font-weight", "700", "color", "#fff"], [2, "padding", "5px 12px", "border-radius", "6px", "font-size", "9px", "font-weight", "700"], [2, "display", "inline-block", "width", "5px", "height", "5px", "border-radius", "50%", "background", "var(--brand)", "margin-left", "5px", "vertical-align", "middle"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click"], ["type", "button", 1, "theme-card", 3, "click"], [1, "theme-current-badge"], [1, "theme-swatches"], [1, "theme-card-info"], [1, "theme-card-name"], [2, "padding", "6px 8px", "border-radius", "6px", "font-size", "9px", "margin-bottom", "3px", "font-weight", "600"], [2, "display", "flex", "align-items", "center", "padding", "6px 10px", "font-size", "9px"], [2, "flex", "1", "font-weight", "700"], [2, "padding", "1.5px 6px", "border-radius", "10px", "font-size", "7.5px", "font-weight", "700"]], template: function AppearanceComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0)(1, "button", 1);
      \u0275\u0275listener("click", function AppearanceComponent_Template_button_click_1_listener() {
        return ctx.discard();
      });
      \u0275\u0275text(2, "Discard Changes");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(3, "button", 2);
      \u0275\u0275listener("click", function AppearanceComponent_Template_button_click_3_listener() {
        return ctx.save();
      });
      \u0275\u0275template(4, AppearanceComponent_Conditional_4_Template, 1, 0, "span", 3);
      \u0275\u0275text(5, " Save Theme ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(6, "div", 4);
      \u0275\u0275text(7, " \u{1F3A8} Every role can have its own look. Changes preview instantly \u2014 on ");
      \u0275\u0275elementStart(8, "strong");
      \u0275\u0275text(9, "your");
      \u0275\u0275elementEnd();
      \u0275\u0275text(10, " screen and in the preview panel \u2014 as you click around. Nothing is applied for that role's users until you hit ");
      \u0275\u0275elementStart(11, "strong");
      \u0275\u0275text(12, "Save Theme");
      \u0275\u0275elementEnd();
      \u0275\u0275text(13, ". ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "section", 5)(15, "div", 6)(16, "div", 7);
      \u0275\u0275repeaterCreate(17, AppearanceComponent_For_18_Template, 3, 4, "button", 8, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd();
      \u0275\u0275template(19, AppearanceComponent_Conditional_19_Template, 2, 2, "button", 9)(20, AppearanceComponent_Conditional_20_Template, 4, 0, "a", 10);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(21, "div", 11);
      \u0275\u0275text(22);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(23, "div", 12)(24, "div", 13)(25, "section", 14)(26, "div", 15)(27, "div")(28, "div", 16);
      \u0275\u0275text(29, "Preset Themes");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(30, "div", 17);
      \u0275\u0275text(31, "15 curated palettes \u2014 click one to preview it instantly");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(32, "button", 18);
      \u0275\u0275listener("click", function AppearanceComponent_Template_button_click_32_listener() {
        return ctx.selectPreset("indigo");
      });
      \u0275\u0275text(33, "Reset to Default");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(34, "div", 19);
      \u0275\u0275repeaterCreate(35, AppearanceComponent_For_36_Template, 11, 13, "button", 20, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(37, "section", 14)(38, "div", 15)(39, "div")(40, "div", 16);
      \u0275\u0275text(41, "Custom Theme");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(42, "div", 17);
      \u0275\u0275text(43, "Build your own palette \u2014 editing any field switches the live app to your custom colors");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(44, AppearanceComponent_Conditional_44_Template, 2, 0, "span", 21);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(45, "div", 22)(46, "div", 23)(47, "label");
      \u0275\u0275text(48, "Primary Color");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(49, "div", 24)(50, "input", 25);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_50_listener($event) {
        return ctx.setCustom("primary", $event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(51, "input", 26);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_51_listener($event) {
        return ctx.setCustom("primary", $event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(52, "span", 27);
      \u0275\u0275text(53, "Buttons, links, active nav");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(54, "div", 23)(55, "label");
      \u0275\u0275text(56, "Secondary Color");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(57, "div", 24)(58, "input", 25);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_58_listener($event) {
        return ctx.setCustom("secondary", $event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(59, "input", 26);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_59_listener($event) {
        return ctx.setCustom("secondary", $event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(60, "span", 27);
      \u0275\u0275text(61, "Sidebar & gradients");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(62, "div", 23)(63, "label");
      \u0275\u0275text(64, "Accent Color");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(65, "div", 24)(66, "input", 25);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_66_listener($event) {
        return ctx.setCustom("accent", $event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(67, "input", 26);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_67_listener($event) {
        return ctx.setCustom("accent", $event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(68, "span", 27);
      \u0275\u0275text(69, "Highlights & charts");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(70, "div", 23)(71, "label");
      \u0275\u0275text(72, "Mode");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(73, "div", 28)(74, "button", 29);
      \u0275\u0275listener("click", function AppearanceComponent_Template_button_click_74_listener() {
        return ctx.setCustom("mode", "light");
      });
      \u0275\u0275text(75, "\u2600 Light");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(76, "button", 29);
      \u0275\u0275listener("click", function AppearanceComponent_Template_button_click_76_listener() {
        return ctx.setCustom("mode", "dark");
      });
      \u0275\u0275text(77, "\u{1F319} Dark");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(78, AppearanceComponent_Conditional_78_Template, 12, 4);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(79, "div", 30)(80, "div", 31)(81, "span");
      \u0275\u0275text(82);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(83, "span", 32);
      \u0275\u0275text(84);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(85, "div", 33)(86, "div", 34)(87, "div", 35)(88, "div", 36)(89, "div", 37);
      \u0275\u0275text(90, "K");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(91, "span", 38);
      \u0275\u0275text(92, "Klogu Bizz");
      \u0275\u0275elementEnd()();
      \u0275\u0275repeaterCreate(93, AppearanceComponent_For_94_Template, 2, 5, "div", 39, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(95, "div", 40)(96, "div", 41)(97, "div", 42);
      \u0275\u0275text(98, "\u{1F319}");
      \u0275\u0275elementEnd();
      \u0275\u0275element(99, "div", 43);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(100, "div", 44)(101, "div", 45)(102, "span", 46);
      \u0275\u0275text(103, "All");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(104, "span", 47);
      \u0275\u0275text(105, "Paid");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(106, "span", 47);
      \u0275\u0275text(107, "Overdue");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(108, "div", 48)(109, "div", 49)(110, "div", 50);
      \u0275\u0275text(111, "Revenue");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(112, "div", 51);
      \u0275\u0275text(113, "\u20B96,30,120");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(114, "div", 49)(115, "div", 50);
      \u0275\u0275text(116, "Pending");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(117, "div", 51);
      \u0275\u0275text(118, "\u20B91,06,200");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(119, "div", 52)(120, "div", 53)(121, "span", 54);
      \u0275\u0275text(122, "Invoice");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(123, "span", 55);
      \u0275\u0275text(124, "Client");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(125, "span", 56);
      \u0275\u0275text(126, "Status");
      \u0275\u0275elementEnd()();
      \u0275\u0275repeaterCreate(127, AppearanceComponent_For_128_Template, 8, 15, "div", 57, _forTrack1);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(129, "div", 58)(130, "span", 59);
      \u0275\u0275text(131, "Primary");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(132, "span", 60);
      \u0275\u0275text(133, "Secondary");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(134, "span", 60);
      \u0275\u0275text(135, "Danger");
      \u0275\u0275elementEnd()()()()()()()()();
    }
    if (rf & 2) {
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.dirty());
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", !ctx.dirty() || ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 4 : -1);
      \u0275\u0275advance(13);
      \u0275\u0275repeater(ctx.roles);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.isBusinessPlan() ? 19 : 20);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate2(" Editing the theme ", ctx.roleMeta[ctx.selectedRole()].label, " users see \u2014 ", ctx.roleMeta[ctx.selectedRole()].description, " ");
      \u0275\u0275advance(13);
      \u0275\u0275repeater(ctx.presets);
      \u0275\u0275advance(9);
      \u0275\u0275conditional(ctx.mode() === "custom" ? 44 : -1);
      \u0275\u0275advance(6);
      \u0275\u0275property("ngModel", ctx.custom().primary);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.custom().primary);
      \u0275\u0275advance(7);
      \u0275\u0275property("ngModel", ctx.custom().secondary);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.custom().secondary);
      \u0275\u0275advance(7);
      \u0275\u0275property("ngModel", ctx.custom().accent);
      \u0275\u0275advance();
      \u0275\u0275property("ngModel", ctx.custom().accent);
      \u0275\u0275advance(7);
      \u0275\u0275classProp("active", ctx.custom().mode === "light");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.custom().mode === "dark");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.custom().mode === "dark" ? 78 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate1("Live Preview \u2014 ", ctx.roleMeta[ctx.selectedRole()].label, "'s screen");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.mode() === "custom" ? "Custom" : ctx.selectedPresetName());
      \u0275\u0275advance(3);
      \u0275\u0275styleProp("background", "linear-gradient(180deg," + ctx.previewVars()["--sidebar-from"] + "," + ctx.previewVars()["--sidebar-to"] + ")");
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("background", "linear-gradient(135deg," + ctx.previewVars()["--brand-light"] + "," + ctx.previewVars()["--brand"] + ")");
      \u0275\u0275advance(4);
      \u0275\u0275repeater(ctx.previewNav);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("background", ctx.previewVars()["--bg"]);
      \u0275\u0275advance();
      \u0275\u0275styleProp("background", ctx.previewVars()["--card"])("border-bottom", "1px solid " + ctx.previewVars()["--border"]);
      \u0275\u0275advance();
      \u0275\u0275styleProp("background", ctx.previewVars()["--brand-pale"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("background", ctx.previewVars()["--brand-mid"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("background", ctx.previewVars()["--brand-pale"]);
      \u0275\u0275advance();
      \u0275\u0275styleProp("background", ctx.previewVars()["--card"])("color", ctx.previewVars()["--brand"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("color", ctx.previewVars()["--muted"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("color", ctx.previewVars()["--muted"]);
      \u0275\u0275advance(3);
      \u0275\u0275styleProp("background", ctx.previewVars()["--card"])("border", "1px solid " + ctx.previewVars()["--border"]);
      \u0275\u0275advance();
      \u0275\u0275styleProp("color", ctx.previewVars()["--muted"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("color", ctx.previewVars()["--text"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("background", ctx.previewVars()["--card"])("border", "1px solid " + ctx.previewVars()["--border"]);
      \u0275\u0275advance();
      \u0275\u0275styleProp("color", ctx.previewVars()["--muted"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("color", ctx.previewVars()["--amber"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("border", "1px solid " + ctx.previewVars()["--border"]);
      \u0275\u0275advance();
      \u0275\u0275styleProp("background", ctx.previewVars()["--surface-alt"])("color", ctx.previewVars()["--faint"]);
      \u0275\u0275advance(7);
      \u0275\u0275repeater(ctx.previewRows);
      \u0275\u0275advance(3);
      \u0275\u0275styleProp("background", "linear-gradient(135deg," + ctx.previewVars()["--brand-light"] + "," + ctx.previewVars()["--brand"] + ")");
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("background", ctx.previewVars()["--card"])("color", ctx.previewVars()["--brand"])("border", "1px solid " + ctx.previewVars()["--border-hard"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("color", ctx.previewVars()["--red"])("background", ctx.previewVars()["--red-bg"]);
    }
  }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, NgControlStatus, NgModel, RouterLink, AppShellComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AppearanceComponent, { className: "AppearanceComponent", filePath: "src\\app\\features\\appearance\\appearance.component.ts", lineNumber: 246 });
})();
export {
  AppearanceComponent
};
//# sourceMappingURL=chunk-2DDGEVU4.js.map
