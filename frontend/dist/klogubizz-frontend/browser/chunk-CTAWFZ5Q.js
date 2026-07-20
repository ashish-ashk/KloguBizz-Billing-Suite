import {
  SkeletonRowsComponent,
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
import "./chunk-FVB5LDTQ.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
import {
  CommonModule,
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
  ɵɵreference,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-6VNHH65J.js";

// src/app/features/super-admin/branding.component.ts
function SuperBrandingComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 5);
    \u0275\u0275element(1, "app-skeleton-rows", 7);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 5);
  }
}
function SuperBrandingComponent_Conditional_10_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 38);
    \u0275\u0275elementStart(1, "div", 39);
    \u0275\u0275element(2, "app-icon", 40);
    \u0275\u0275text(3, " Uploaded \u2014 click to replace ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r2.branding.logoUrl, \u0275\u0275sanitizeUrl);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 13);
  }
}
function SuperBrandingComponent_Conditional_10_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 41);
    \u0275\u0275element(1, "app-icon", 42);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 43);
    \u0275\u0275text(3, "Click to upload");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 22);
  }
}
function SuperBrandingComponent_Conditional_10_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 44);
    \u0275\u0275elementStart(1, "div", 39);
    \u0275\u0275element(2, "app-icon", 40);
    \u0275\u0275text(3, " Uploaded \u2014 click to replace ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r2.branding.faviconUrl, \u0275\u0275sanitizeUrl);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 13);
  }
}
function SuperBrandingComponent_Conditional_10_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 41);
    \u0275\u0275element(1, "app-icon", 42);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 43);
    \u0275\u0275text(3, "Click to upload");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 22);
  }
}
function SuperBrandingComponent_Conditional_10_Conditional_73_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 26);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r2.branding.logoUrl, \u0275\u0275sanitizeUrl);
  }
}
function SuperBrandingComponent_Conditional_10_Conditional_74_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 45);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275styleProp("background", "linear-gradient(135deg," + ctx_r2.branding.accentColor + "," + ctx_r2.branding.primaryColor + ")");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", (ctx_r2.branding.appName || "K")[0], " ");
  }
}
function SuperBrandingComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 6)(1, "div", 8)(2, "section", 9)(3, "div", 10);
    \u0275\u0275text(4, "Platform Logo");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 11)(6, "div")(7, "div", 12);
    \u0275\u0275text(8, "Main Logo");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 13);
    \u0275\u0275text(10, "200\xD760px PNG/SVG \xB7 Used in sidebar, emails, invoices");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 14);
    \u0275\u0275listener("click", function SuperBrandingComponent_Conditional_10_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r1);
      const logoInput_r2 = \u0275\u0275reference(15);
      return \u0275\u0275resetView(logoInput_r2.click());
    });
    \u0275\u0275template(12, SuperBrandingComponent_Conditional_10_Conditional_12_Template, 4, 2)(13, SuperBrandingComponent_Conditional_10_Conditional_13_Template, 4, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "input", 15, 0);
    \u0275\u0275listener("change", function SuperBrandingComponent_Conditional_10_Template_input_change_14_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onFile($event, "logoUrl"));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div")(17, "div", 12);
    \u0275\u0275text(18, "Favicon / App Icon");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 13);
    \u0275\u0275text(20, "512\xD7512px PNG \xB7 Browser tab and mobile icon");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "button", 14);
    \u0275\u0275listener("click", function SuperBrandingComponent_Conditional_10_Template_button_click_21_listener() {
      \u0275\u0275restoreView(_r1);
      const favInput_r4 = \u0275\u0275reference(25);
      return \u0275\u0275resetView(favInput_r4.click());
    });
    \u0275\u0275template(22, SuperBrandingComponent_Conditional_10_Conditional_22_Template, 4, 2)(23, SuperBrandingComponent_Conditional_10_Conditional_23_Template, 4, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "input", 15, 1);
    \u0275\u0275listener("change", function SuperBrandingComponent_Conditional_10_Template_input_change_24_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onFile($event, "faviconUrl"));
    });
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(26, "section", 9)(27, "div", 10);
    \u0275\u0275text(28, "Brand Colors");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 16)(30, "div", 17)(31, "label");
    \u0275\u0275text(32, "Primary Color");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "div", 18)(34, "input", 19);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_34_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.primaryColor, $event) || (ctx_r2.branding.primaryColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "input", 20);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_35_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.primaryColor, $event) || (ctx_r2.branding.primaryColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(36, "div", 17)(37, "label");
    \u0275\u0275text(38, "Secondary Color");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(39, "div", 18)(40, "input", 19);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_40_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.secondaryColor, $event) || (ctx_r2.branding.secondaryColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "input", 20);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_41_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.secondaryColor, $event) || (ctx_r2.branding.secondaryColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(42, "div", 17)(43, "label");
    \u0275\u0275text(44, "Accent Color");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "div", 18)(46, "input", 19);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_46_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.accentColor, $event) || (ctx_r2.branding.accentColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "input", 20);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_47_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.accentColor, $event) || (ctx_r2.branding.accentColor = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275elementStart(48, "section", 9)(49, "div", 10);
    \u0275\u0275text(50, "Platform Information");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "div", 21)(52, "div", 17)(53, "label");
    \u0275\u0275text(54, "App Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(55, "input", 22);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_55_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.appName, $event) || (ctx_r2.branding.appName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(56, "div", 17)(57, "label");
    \u0275\u0275text(58, "Tagline");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(59, "input", 22);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_59_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.tagline, $event) || (ctx_r2.branding.tagline = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(60, "div", 17)(61, "label");
    \u0275\u0275text(62, "Support Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(63, "input", 22);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_63_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.supportEmail, $event) || (ctx_r2.branding.supportEmail = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(64, "div", 17)(65, "label");
    \u0275\u0275text(66, "Website URL");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(67, "input", 22);
    \u0275\u0275twoWayListener("ngModelChange", function SuperBrandingComponent_Conditional_10_Template_input_ngModelChange_67_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.branding.websiteUrl, $event) || (ctx_r2.branding.websiteUrl = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275elementStart(68, "section", 23)(69, "div", 10);
    \u0275\u0275text(70, "Live Preview");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(71, "div", 24)(72, "div", 25);
    \u0275\u0275template(73, SuperBrandingComponent_Conditional_10_Conditional_73_Template, 1, 1, "img", 26)(74, SuperBrandingComponent_Conditional_10_Conditional_74_Template, 2, 3, "div", 27);
    \u0275\u0275elementStart(75, "div")(76, "div", 28);
    \u0275\u0275text(77);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(78, "div", 29);
    \u0275\u0275text(79);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(80, "div", 30);
    \u0275\u0275element(81, "app-icon", 31);
    \u0275\u0275text(82, " Dashboard ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(83, "div", 32);
    \u0275\u0275element(84, "app-icon", 33);
    \u0275\u0275text(85, " Invoices ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(86, "div", 32);
    \u0275\u0275element(87, "app-icon", 34);
    \u0275\u0275text(88, " Payments ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(89, "div", 35)(90, "button", 36);
    \u0275\u0275text(91, "Primary Button");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(92, "button", 37);
    \u0275\u0275text(93, "Secondary Button");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(12);
    \u0275\u0275conditional(ctx_r2.branding.logoUrl ? 12 : 13);
    \u0275\u0275advance(10);
    \u0275\u0275conditional(ctx_r2.branding.faviconUrl ? 22 : 23);
    \u0275\u0275advance(12);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.primaryColor);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.primaryColor);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.secondaryColor);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.secondaryColor);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.accentColor);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.accentColor);
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.appName);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.tagline);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.supportEmail);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.branding.websiteUrl);
    \u0275\u0275advance(6);
    \u0275\u0275conditional(ctx_r2.branding.logoUrl ? 73 : 74);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.branding.appName || "Klogu Bizz");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.branding.tagline || "GST Billing Suite");
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", ctx_r2.hexToTint(ctx_r2.branding.primaryColor));
    \u0275\u0275advance();
    \u0275\u0275property("size", 13);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 13);
    \u0275\u0275advance(3);
    \u0275\u0275property("size", 13);
    \u0275\u0275advance(3);
    \u0275\u0275styleProp("background", "linear-gradient(135deg," + ctx_r2.branding.primaryColor + "," + ctx_r2.branding.secondaryColor + ")");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r2.branding.primaryColor)("border-color", ctx_r2.branding.primaryColor);
  }
}
var SuperBrandingComponent = class _SuperBrandingComponent {
  api;
  toast;
  loading = signal(true);
  saving = signal(false);
  branding = {
    appName: "Klogu Bizz",
    tagline: "GST Billing Suite",
    primaryColor: "#4F46E5",
    secondaryColor: "#312E81",
    accentColor: "#818CF8",
    supportEmail: "",
    websiteUrl: "",
    logoUrl: "",
    faviconUrl: ""
  };
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.api.superSettings().subscribe({
      next: (s) => {
        if (s["branding"])
          this.branding = __spreadValues(__spreadValues({}, this.branding), s["branding"]);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
  }
  onFile(event, key) {
    const file = event.target.files?.[0];
    if (!file)
      return;
    if (file.size > 500 * 1024) {
      this.toast.error("Image must be under 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.branding[key] = reader.result;
    };
    reader.readAsDataURL(file);
  }
  hexToTint(hex) {
    return `linear-gradient(135deg, ${hex}59, ${hex}33)`;
  }
  save() {
    this.saving.set(true);
    this.api.superSaveSetting("branding", this.branding).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success("Branding saved");
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function SuperBrandingComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SuperBrandingComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuperBrandingComponent, selectors: [["app-super-branding"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 11, vars: 2, consts: [["logoInput", ""], ["favInput", ""], [1, "page-head"], [1, "page-actions"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "card", "flush"], [1, "grid", "grid-wide"], [3, "count"], [2, "display", "grid", "gap", "16px", "align-content", "start"], [1, "card"], [1, "card-title", 2, "margin-bottom", "14px"], [1, "grid", "grid-2"], [2, "font-size", "12px", "font-weight", "600", "margin-bottom", "4px"], [2, "font-size", "11px", "color", "var(--muted)", "margin-bottom", "8px"], ["type", "button", 2, "width", "100%", "border", "2px dashed var(--border)", "border-radius", "10px", "padding", "22px", "text-align", "center", "background", "var(--card)", "cursor", "pointer", 3, "click"], ["type", "file", "accept", "image/*", "hidden", "", 3, "change"], [1, "grid", "grid-3"], [1, "field"], [2, "display", "flex", "gap", "8px", "align-items", "center"], ["type", "color", 2, "width", "42px", "height", "42px", "border", "1px solid var(--border)", "border-radius", "8px", "padding", "2px", "background", "var(--card)", "cursor", "pointer", "flex-shrink", "0", 3, "ngModelChange", "ngModel"], [1, "mono", 3, "ngModelChange", "ngModel"], [1, "grid", "grid-2", 2, "gap", "12px"], [3, "ngModelChange", "ngModel"], [1, "card", 2, "align-self", "start"], [2, "background", "var(--card)", "border", "1px solid var(--border)", "border-radius", "12px", "padding", "14px"], [2, "display", "flex", "align-items", "center", "gap", "9px", "margin-bottom", "14px"], ["alt", "Logo", 2, "height", "28px", 3, "src"], [2, "width", "30px", "height", "30px", "border-radius", "8px", "display", "grid", "place-items", "center", "color", "#fff", "font-weight", "800", "font-size", "13px", 3, "background"], [2, "color", "var(--text)", "font-weight", "800", "font-size", "13px"], [2, "color", "var(--muted)", "font-size", "10px"], [2, "border-radius", "8px", "padding", "8px 10px", "color", "var(--brand)", "font-size", "12px", "font-weight", "600", "margin-bottom", "4px", "display", "flex", "align-items", "center", "gap", "7px"], ["name", "dashboard", 3, "size"], [2, "padding", "8px 10px", "color", "var(--muted)", "font-size", "12px", "display", "flex", "align-items", "center", "gap", "7px"], ["name", "invoice", 3, "size"], ["name", "creditCard", 3, "size"], [2, "display", "grid", "gap", "10px", "margin-top", "16px"], ["type", "button", 2, "border", "0", "border-radius", "8px", "padding", "10px", "color", "#fff", "font-weight", "700", "font-size", "13px", "cursor", "default"], ["type", "button", 2, "background", "var(--card)", "border", "1.5px solid", "border-radius", "8px", "padding", "10px", "font-weight", "700", "font-size", "13px", "cursor", "default"], ["alt", "Logo", 2, "max-height", "40px", "max-width", "100%", "display", "block", "margin", "0 auto 8px", 3, "src"], [2, "font-size", "11px", "color", "var(--green)", "font-weight", "600", "display", "flex", "align-items", "center", "justify-content", "center", "gap", "5px"], ["name", "checkCircle", 3, "size"], [2, "display", "flex", "justify-content", "center", "color", "var(--muted)"], ["name", "upload", 3, "size"], [2, "font-size", "12px", "color", "var(--muted)", "margin-top", "6px"], ["alt", "Favicon", 2, "max-height", "40px", "display", "block", "margin", "0 auto 8px", 3, "src"], [2, "width", "30px", "height", "30px", "border-radius", "8px", "display", "grid", "place-items", "center", "color", "#fff", "font-weight", "800", "font-size", "13px"]], template: function SuperBrandingComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 2)(1, "div")(2, "h1");
      \u0275\u0275text(3, "Branding & Logo");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "p");
      \u0275\u0275text(5, "White-label the platform");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(6, "div", 3)(7, "button", 4);
      \u0275\u0275listener("click", function SuperBrandingComponent_Template_button_click_7_listener() {
        return ctx.save();
      });
      \u0275\u0275text(8, "Save Branding");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(9, SuperBrandingComponent_Conditional_9_Template, 2, 1, "div", 5)(10, SuperBrandingComponent_Conditional_10_Template, 94, 26, "div", 6);
    }
    if (rf & 2) {
      \u0275\u0275advance(7);
      \u0275\u0275property("disabled", ctx.saving());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loading() ? 9 : 10);
    }
  }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, NgControlStatus, NgModel, SkeletonRowsComponent, IconComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuperBrandingComponent, { className: "SuperBrandingComponent", filePath: "src\\app\\features\\super-admin\\branding.component.ts", lineNumber: 148 });
})();
export {
  SuperBrandingComponent
};
//# sourceMappingURL=chunk-CTAWFZ5Q.js.map
