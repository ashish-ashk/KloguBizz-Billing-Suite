import {
  AppShellComponent
} from "./chunk-YNECOBXO.js";
import "./chunk-4KISL3AY.js";
import {
  PRESET_THEMES,
  TENANT_ROLES,
  ThemeService,
  getPreset,
  resolvePalette
} from "./chunk-FOTQGH3M.js";
import {
  ToastService
} from "./chunk-OBVHAWX5.js";
import "./chunk-7F65RAZH.js";
import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel
} from "./chunk-XAFCZYPI.js";
import {
  AuthService,
  RouterLink
} from "./chunk-6FSA7WVR.js";
import "./chunk-FVB5LDTQ.js";
import "./chunk-36HDS2M4.js";
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
} from "./chunk-6VNHH65J.js";

// src/app/features/appearance/appearance.component.ts
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.name;
function AppearanceComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 3);
  }
}
function AppearanceComponent_For_20_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 64);
  }
}
function AppearanceComponent_For_20_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 30);
    \u0275\u0275listener("click", function AppearanceComponent_For_20_Template_button_click_0_listener() {
      const role_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selectRole(role_r2));
    });
    \u0275\u0275text(1);
    \u0275\u0275template(2, AppearanceComponent_For_20_Conditional_2_Template, 1, 0, "span", 64);
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
function AppearanceComponent_Conditional_21_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-icon", 31);
    \u0275\u0275text(1, " Switch to Light ");
  }
  if (rf & 2) {
    \u0275\u0275property("size", 13);
  }
}
function AppearanceComponent_Conditional_21_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-icon", 32);
    \u0275\u0275text(1, " Switch to Dark ");
  }
  if (rf & 2) {
    \u0275\u0275property("size", 13);
  }
}
function AppearanceComponent_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 65);
    \u0275\u0275listener("click", function AppearanceComponent_Conditional_21_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.toggleDarkForRole());
    });
    \u0275\u0275template(1, AppearanceComponent_Conditional_21_Conditional_1_Template, 2, 1)(2, AppearanceComponent_Conditional_21_Conditional_2_Template, 2, 1);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.previewIsDark() ? 1 : 2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" for ", ctx_r2.roleMeta[ctx_r2.selectedRole()].label, " ");
  }
}
function AppearanceComponent_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 11);
    \u0275\u0275element(1, "app-icon", 66);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3, "Dark mode toggle is a Business plan feature \u2014 ");
    \u0275\u0275elementStart(4, "strong");
    \u0275\u0275text(5, "Upgrade to unlock");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 14);
  }
}
function AppearanceComponent_For_38_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 68);
    \u0275\u0275text(1, "Current");
    \u0275\u0275elementEnd();
  }
}
function AppearanceComponent_For_38_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-icon", 32);
    \u0275\u0275text(1, " Dark ");
  }
  if (rf & 2) {
    \u0275\u0275property("size", 11);
  }
}
function AppearanceComponent_For_38_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-icon", 31);
    \u0275\u0275text(1, " Light ");
  }
  if (rf & 2) {
    \u0275\u0275property("size", 11);
  }
}
function AppearanceComponent_For_38_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 67);
    \u0275\u0275listener("click", function AppearanceComponent_For_38_Template_button_click_0_listener() {
      const t_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selectPreset(t_r6.id));
    });
    \u0275\u0275template(1, AppearanceComponent_For_38_Conditional_1_Template, 2, 0, "span", 68);
    \u0275\u0275elementStart(2, "span", 69);
    \u0275\u0275element(3, "span")(4, "span")(5, "span");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 70)(7, "span", 71);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 35);
    \u0275\u0275template(10, AppearanceComponent_For_38_Conditional_10_Template, 2, 1)(11, AppearanceComponent_For_38_Conditional_11_Template, 2, 1);
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
    \u0275\u0275conditional(t_r6.mode === "dark" ? 10 : 11);
  }
}
function AppearanceComponent_Conditional_46_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 22);
    \u0275\u0275text(1, "\u2713 Currently Active");
    \u0275\u0275elementEnd();
  }
}
function AppearanceComponent_Conditional_82_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 24)(1, "label");
    \u0275\u0275text(2, "Background Color");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 25)(4, "input", 26);
    \u0275\u0275listener("ngModelChange", function AppearanceComponent_Conditional_82_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setCustom("background", $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "input", 27);
    \u0275\u0275listener("ngModelChange", function AppearanceComponent_Conditional_82_Template_input_ngModelChange_5_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setCustom("background", $event));
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(6, "div", 24)(7, "label");
    \u0275\u0275text(8, "Text Color");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 25)(10, "input", 26);
    \u0275\u0275listener("ngModelChange", function AppearanceComponent_Conditional_82_Template_input_ngModelChange_10_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setCustom("text", $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "input", 27);
    \u0275\u0275listener("ngModelChange", function AppearanceComponent_Conditional_82_Template_input_ngModelChange_11_listener($event) {
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
function AppearanceComponent_For_98_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 72);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const item_r8 = ctx.$implicit;
    const \u0275$index_241_r9 = ctx.$index;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275styleProp("background", \u0275$index_241_r9 === 0 ? ctx_r2.previewVars()["--brand-pale"] : "transparent")("color", \u0275$index_241_r9 === 0 ? ctx_r2.previewVars()["--brand"] : ctx_r2.previewVars()["--muted"]);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(item_r8);
  }
}
function AppearanceComponent_For_132_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 73)(1, "span", 74);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 58);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 59)(6, "span", 75);
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
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AppearanceComponent, selectors: [["app-appearance"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 140, vars: 88, consts: [["title", "Appearance", "subtitle", "Customize how Klogu Bizz looks for each role in your organization"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], ["actions", "", "type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], [1, "info-box", 2, "margin-bottom", "20px", "display", "flex", "gap", "8px", "align-items", "flex-start"], ["name", "palette", 2, "margin-top", "1px", "flex-shrink", "0", 3, "size"], [1, "card", 2, "margin-bottom", "20px"], [2, "display", "flex", "align-items", "center", "justify-content", "space-between", "gap", "16px", "flex-wrap", "wrap"], [1, "tabs"], ["type", "button", 3, "active"], ["type", "button", 1, "btn", "secondary", "sm"], ["routerLink", "/subscription", 1, "info-box", "warn", 2, "margin", "0", "text-decoration", "none", "display", "flex", "gap", "8px", "align-items", "center"], [1, "card-sub", 2, "margin-top", "10px"], [1, "appearance-layout"], [2, "display", "grid", "gap", "20px"], [1, "card"], [1, "card-head"], [1, "card-title"], [1, "card-sub"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], [1, "grid", "grid-3", 2, "gap", "12px"], ["type", "button", 1, "theme-card", 3, "selected"], [1, "pill", "active"], [1, "grid", "grid-2", 2, "gap", "14px"], [1, "field"], [1, "color-field"], ["type", "color", 3, "ngModelChange", "ngModel"], [1, "mono", 3, "ngModelChange", "ngModel"], [1, "hint"], [1, "tabs", 2, "width", "fit-content"], ["type", "button", 3, "click"], ["name", "sun", 3, "size"], ["name", "moon", 3, "size"], [2, "position", "sticky", "top", "20px"], [1, "card-sub", 2, "margin-bottom", "10px", "display", "flex", "justify-content", "space-between", "align-items", "center"], [1, "pill"], [1, "preview-frame", 2, "padding", "0", "overflow", "hidden"], [2, "display", "flex", "min-height", "400px"], [2, "width", "118px", "flex-shrink", "0", "padding", "14px 9px"], [2, "display", "flex", "align-items", "center", "gap", "6px", "margin-bottom", "16px"], [2, "width", "20px", "height", "20px", "border-radius", "6px", "display", "grid", "place-items", "center", "font-size", "10px", "font-weight", "800", "color", "#fff", "flex-shrink", "0"], [2, "font-size", "9.5px", "font-weight", "800"], [2, "padding", "6px 8px", "border-radius", "6px", "font-size", "9px", "margin-bottom", "3px", "font-weight", "600", 3, "background", "color"], [2, "flex", "1", "min-width", "0"], [2, "height", "28px", "display", "flex", "align-items", "center", "justify-content", "flex-end", "padding", "0 12px", "gap", "7px"], [2, "width", "18px", "height", "18px", "border-radius", "50%", "display", "grid", "place-items", "center"], [2, "width", "18px", "height", "18px", "border-radius", "50%"], [2, "padding", "12px"], [2, "display", "inline-flex", "gap", "2px", "padding", "2px", "border-radius", "6px", "margin-bottom", "10px"], [2, "padding", "3px 9px", "border-radius", "5px", "font-size", "9px", "font-weight", "700"], [2, "padding", "3px 9px", "font-size", "9px", "font-weight", "600"], [2, "display", "grid", "grid-template-columns", "1fr 1fr", "gap", "8px", "margin-bottom", "10px"], [2, "border-radius", "8px", "padding", "8px 10px"], [2, "font-size", "8px", "text-transform", "uppercase", "font-weight", "700", "letter-spacing", ".4px"], [2, "font-size", "13px", "font-weight", "800", "margin-top", "3px"], [2, "border-radius", "8px", "overflow", "hidden"], [2, "display", "flex", "padding", "6px 10px", "font-size", "7.5px", "font-weight", "700", "text-transform", "uppercase", "letter-spacing", ".3px"], [2, "flex", "1"], [2, "flex", "1.4"], [2, "width", "48px", "text-align", "right"], [2, "display", "flex", "align-items", "center", "padding", "6px 10px", "font-size", "9px", 3, "background", "borderTop"], [2, "display", "flex", "gap", "6px", "margin-top", "10px", "flex-wrap", "wrap"], [2, "padding", "5px 12px", "border-radius", "6px", "font-size", "9px", "font-weight", "700", "color", "#fff"], [2, "padding", "5px 12px", "border-radius", "6px", "font-size", "9px", "font-weight", "700"], [2, "display", "inline-block", "width", "5px", "height", "5px", "border-radius", "50%", "background", "var(--brand)", "margin-left", "5px", "vertical-align", "middle"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click"], ["name", "lock", 3, "size"], ["type", "button", 1, "theme-card", 3, "click"], [1, "theme-current-badge"], [1, "theme-swatches"], [1, "theme-card-info"], [1, "theme-card-name"], [2, "padding", "6px 8px", "border-radius", "6px", "font-size", "9px", "margin-bottom", "3px", "font-weight", "600"], [2, "display", "flex", "align-items", "center", "padding", "6px 10px", "font-size", "9px"], [2, "flex", "1", "font-weight", "700"], [2, "padding", "1.5px 6px", "border-radius", "10px", "font-size", "7.5px", "font-weight", "700"]], template: function AppearanceComponent_Template(rf, ctx) {
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
      \u0275\u0275element(7, "app-icon", 5);
      \u0275\u0275elementStart(8, "span");
      \u0275\u0275text(9, "Every role can have its own look. Changes preview instantly \u2014 on ");
      \u0275\u0275elementStart(10, "strong");
      \u0275\u0275text(11, "your");
      \u0275\u0275elementEnd();
      \u0275\u0275text(12, " screen and in the preview panel \u2014 as you click around. Nothing is applied for that role's users until you hit ");
      \u0275\u0275elementStart(13, "strong");
      \u0275\u0275text(14, "Save Theme");
      \u0275\u0275elementEnd();
      \u0275\u0275text(15, ".");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(16, "section", 6)(17, "div", 7)(18, "div", 8);
      \u0275\u0275repeaterCreate(19, AppearanceComponent_For_20_Template, 3, 4, "button", 9, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd();
      \u0275\u0275template(21, AppearanceComponent_Conditional_21_Template, 4, 2, "button", 10)(22, AppearanceComponent_Conditional_22_Template, 6, 1, "a", 11);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(23, "div", 12);
      \u0275\u0275text(24);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(25, "div", 13)(26, "div", 14)(27, "section", 15)(28, "div", 16)(29, "div")(30, "div", 17);
      \u0275\u0275text(31, "Preset Themes");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(32, "div", 18);
      \u0275\u0275text(33, "15 curated palettes \u2014 click one to preview it instantly");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(34, "button", 19);
      \u0275\u0275listener("click", function AppearanceComponent_Template_button_click_34_listener() {
        return ctx.selectPreset("indigo");
      });
      \u0275\u0275text(35, "Reset to Default");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(36, "div", 20);
      \u0275\u0275repeaterCreate(37, AppearanceComponent_For_38_Template, 12, 13, "button", 21, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(39, "section", 15)(40, "div", 16)(41, "div")(42, "div", 17);
      \u0275\u0275text(43, "Custom Theme");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(44, "div", 18);
      \u0275\u0275text(45, "Build your own palette \u2014 editing any field switches the live app to your custom colors");
      \u0275\u0275elementEnd()();
      \u0275\u0275template(46, AppearanceComponent_Conditional_46_Template, 2, 0, "span", 22);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(47, "div", 23)(48, "div", 24)(49, "label");
      \u0275\u0275text(50, "Primary Color");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(51, "div", 25)(52, "input", 26);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_52_listener($event) {
        return ctx.setCustom("primary", $event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(53, "input", 27);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_53_listener($event) {
        return ctx.setCustom("primary", $event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(54, "span", 28);
      \u0275\u0275text(55, "Buttons, links, active nav");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(56, "div", 24)(57, "label");
      \u0275\u0275text(58, "Secondary Color");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(59, "div", 25)(60, "input", 26);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_60_listener($event) {
        return ctx.setCustom("secondary", $event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "input", 27);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_61_listener($event) {
        return ctx.setCustom("secondary", $event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(62, "span", 28);
      \u0275\u0275text(63, "Sidebar & gradients");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(64, "div", 24)(65, "label");
      \u0275\u0275text(66, "Accent Color");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(67, "div", 25)(68, "input", 26);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_68_listener($event) {
        return ctx.setCustom("accent", $event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(69, "input", 27);
      \u0275\u0275listener("ngModelChange", function AppearanceComponent_Template_input_ngModelChange_69_listener($event) {
        return ctx.setCustom("accent", $event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(70, "span", 28);
      \u0275\u0275text(71, "Highlights & charts");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(72, "div", 24)(73, "label");
      \u0275\u0275text(74, "Mode");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(75, "div", 29)(76, "button", 30);
      \u0275\u0275listener("click", function AppearanceComponent_Template_button_click_76_listener() {
        return ctx.setCustom("mode", "light");
      });
      \u0275\u0275element(77, "app-icon", 31);
      \u0275\u0275text(78, " Light");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(79, "button", 30);
      \u0275\u0275listener("click", function AppearanceComponent_Template_button_click_79_listener() {
        return ctx.setCustom("mode", "dark");
      });
      \u0275\u0275element(80, "app-icon", 32);
      \u0275\u0275text(81, " Dark");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(82, AppearanceComponent_Conditional_82_Template, 12, 4);
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(83, "div", 33)(84, "div", 34)(85, "span");
      \u0275\u0275text(86);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(87, "span", 35);
      \u0275\u0275text(88);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(89, "div", 36)(90, "div", 37)(91, "div", 38)(92, "div", 39)(93, "div", 40);
      \u0275\u0275text(94, "K");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(95, "span", 41);
      \u0275\u0275text(96, "Klogu Bizz");
      \u0275\u0275elementEnd()();
      \u0275\u0275repeaterCreate(97, AppearanceComponent_For_98_Template, 2, 5, "div", 42, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(99, "div", 43)(100, "div", 44)(101, "div", 45);
      \u0275\u0275element(102, "app-icon", 32);
      \u0275\u0275elementEnd();
      \u0275\u0275element(103, "div", 46);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(104, "div", 47)(105, "div", 48)(106, "span", 49);
      \u0275\u0275text(107, "All");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(108, "span", 50);
      \u0275\u0275text(109, "Paid");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(110, "span", 50);
      \u0275\u0275text(111, "Overdue");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(112, "div", 51)(113, "div", 52)(114, "div", 53);
      \u0275\u0275text(115, "Revenue");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(116, "div", 54);
      \u0275\u0275text(117, "\u20B96,30,120");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(118, "div", 52)(119, "div", 53);
      \u0275\u0275text(120, "Pending");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(121, "div", 54);
      \u0275\u0275text(122, "\u20B91,06,200");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(123, "div", 55)(124, "div", 56)(125, "span", 57);
      \u0275\u0275text(126, "Invoice");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(127, "span", 58);
      \u0275\u0275text(128, "Client");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(129, "span", 59);
      \u0275\u0275text(130, "Status");
      \u0275\u0275elementEnd()();
      \u0275\u0275repeaterCreate(131, AppearanceComponent_For_132_Template, 8, 15, "div", 60, _forTrack1);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(133, "div", 61)(134, "span", 62);
      \u0275\u0275text(135, "Primary");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(136, "span", 63);
      \u0275\u0275text(137, "Secondary");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(138, "span", 63);
      \u0275\u0275text(139, "Danger");
      \u0275\u0275elementEnd()()()()()()()()();
    }
    if (rf & 2) {
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.dirty());
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", !ctx.dirty() || ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 4 : -1);
      \u0275\u0275advance(3);
      \u0275\u0275property("size", 14);
      \u0275\u0275advance(12);
      \u0275\u0275repeater(ctx.roles);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.isBusinessPlan() ? 21 : 22);
      \u0275\u0275advance(3);
      \u0275\u0275textInterpolate2(" Editing the theme ", ctx.roleMeta[ctx.selectedRole()].label, " users see \u2014 ", ctx.roleMeta[ctx.selectedRole()].description, " ");
      \u0275\u0275advance(13);
      \u0275\u0275repeater(ctx.presets);
      \u0275\u0275advance(9);
      \u0275\u0275conditional(ctx.mode() === "custom" ? 46 : -1);
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
      \u0275\u0275advance();
      \u0275\u0275property("size", 13);
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.custom().mode === "dark");
      \u0275\u0275advance();
      \u0275\u0275property("size", 13);
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.custom().mode === "dark" ? 82 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate1("Live Preview \u2014 ", ctx.roleMeta[ctx.selectedRole()].label, "'s screen");
      \u0275\u0275advance(2);
      \u0275\u0275textInterpolate(ctx.mode() === "custom" ? "Custom" : ctx.selectedPresetName());
      \u0275\u0275advance(3);
      \u0275\u0275styleProp("background", ctx.previewVars()["--sidebar-bg"])("border-right", "1px solid " + ctx.previewVars()["--border"]);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("background", "linear-gradient(135deg," + ctx.previewVars()["--brand-light"] + "," + ctx.previewVars()["--brand"] + ")");
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("color", ctx.previewVars()["--text"]);
      \u0275\u0275advance(2);
      \u0275\u0275repeater(ctx.previewNav);
      \u0275\u0275advance(2);
      \u0275\u0275styleProp("background", ctx.previewVars()["--bg"]);
      \u0275\u0275advance();
      \u0275\u0275styleProp("background", ctx.previewVars()["--card"])("border-bottom", "1px solid " + ctx.previewVars()["--border"]);
      \u0275\u0275advance();
      \u0275\u0275styleProp("background", ctx.previewVars()["--brand-pale"])("color", ctx.previewVars()["--brand"]);
      \u0275\u0275advance();
      \u0275\u0275property("size", 10);
      \u0275\u0275advance();
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
  }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, NgControlStatus, NgModel, RouterLink, AppShellComponent, IconComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AppearanceComponent, { className: "AppearanceComponent", filePath: "src\\app\\features\\appearance\\appearance.component.ts", lineNumber: 251 });
})();
export {
  AppearanceComponent
};
//# sourceMappingURL=chunk-SIQ5IYBG.js.map
